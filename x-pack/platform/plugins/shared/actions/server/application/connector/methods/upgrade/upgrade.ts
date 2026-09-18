/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { i18n } from '@kbn/i18n';
import { isUndefined, omitBy } from 'lodash';
import type { Connector } from '../../types';
import type { RawAction } from '../../../../types';
import { ConnectorAuditAction, connectorAuditEvent } from '../../../../lib/audit_events';
import { tryCatch, validateConfig, validateSecrets } from '../../../../lib';
import { getAuthMode, isConnectorDeprecated } from '../../lib';
import type { ConnectorUpgradeParams } from './types';

const resolveSpaceId = (context: ConnectorUpgradeParams['context']): string =>
  context.spaceId ?? context.spaces?.getSpaceId(context.request) ?? DEFAULT_SPACE_ID;

/**
 * Moves one connector to the catalog-active spec version after validating its stored config
 * and secrets against the target. The pin is the only attribute that changes.
 */
export async function upgrade({
  context,
  id,
  specVersion: targetVersion,
}: ConnectorUpgradeParams): Promise<Connector> {
  try {
    await context.authorization.ensureAuthorized({ operation: 'update' });
  } catch (error) {
    context.auditLogger?.log(
      connectorAuditEvent({
        action: ConnectorAuditAction.UPGRADE,
        savedObject: { type: 'action', id },
        error,
      })
    );
    throw error;
  }

  if (context.inMemoryConnectors.some((connector) => connector.id === id)) {
    throw Boom.badRequest(
      i18n.translate('xpack.actions.serverSideErrors.inMemoryConnectorUpgradeForbidden', {
        defaultMessage: 'Preconfigured and system connectors cannot be upgraded. Connector: {id}.',
        values: { id },
      })
    );
  }

  const spaceId = resolveSpaceId(context);
  const rawAction = await context.encryptedSavedObjectsClient.getDecryptedAsInternalUser<RawAction>(
    'action',
    id,
    spaceId !== DEFAULT_SPACE_ID ? { namespace: spaceId } : {}
  );
  const { attributes, references, version } = rawAction;
  const { actionTypeId } = attributes;

  const actionType = context.actionTypeRegistry.get(actionTypeId);
  const { specVersions } = actionType;
  if (!specVersions) {
    throw Boom.badRequest(
      i18n.translate('xpack.actions.serverSideErrors.upgradeNotSpecSourced', {
        defaultMessage:
          'Connector type {actionTypeId} does not support spec versions and cannot be upgraded.',
        values: { actionTypeId },
      })
    );
  }

  const activeVersion = specVersions.getActiveVersion();
  if (targetVersion !== activeVersion) {
    throw Boom.badRequest(
      i18n.translate('xpack.actions.serverSideErrors.upgradeTargetNotActive', {
        defaultMessage:
          'Only the active spec version {activeVersion} of {actionTypeId} can be targeted; received {targetVersion}.',
        values: { activeVersion, actionTypeId, targetVersion },
      })
    );
  }

  await specVersions.getSpec(targetVersion);

  const configurationUtilities = context.actionTypeRegistry.getUtils();
  const validatorServices = { configurationUtilities, specVersion: targetVersion };
  validateConfig(actionType, attributes.config, validatorServices);
  validateSecrets(actionType, attributes.secrets, validatorServices);

  context.auditLogger?.log(
    connectorAuditEvent({
      action: ConnectorAuditAction.UPGRADE,
      savedObject: { type: 'action', id },
      outcome: 'unknown',
    })
  );

  const result = await tryCatch(
    async () =>
      await context.unsecuredSavedObjectsClient.create<RawAction>(
        'action',
        {
          ...attributes,
          specVersion: targetVersion,
        },
        omitBy({ id, overwrite: true, references, version }, isUndefined)
      )
  );

  if (result instanceof Error) {
    context.auditLogger?.log(
      connectorAuditEvent({
        action: ConnectorAuditAction.UPGRADE,
        savedObject: { type: 'action', id },
        error: result,
      })
    );
    throw result;
  }

  await context.evictClientPool?.(id);

  return {
    id,
    actionTypeId: result.attributes.actionTypeId,
    isMissingSecrets: result.attributes.isMissingSecrets,
    name: result.attributes.name,
    config: result.attributes.config,
    isPreconfigured: false,
    isSystemAction: false,
    isDeprecated: isConnectorDeprecated(result.attributes),
    isConnectorTypeDeprecated: context.actionTypeRegistry.isDeprecated(actionTypeId),
    authMode: getAuthMode(result.attributes.authMode as Connector['authMode'] | undefined),
    specVersion: result.attributes.specVersion ?? targetVersion,
  };
}
