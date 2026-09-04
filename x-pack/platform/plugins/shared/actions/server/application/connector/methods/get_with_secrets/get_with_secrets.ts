/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { getConnectorSo } from '../../../../data/connector';
import type { ConnectorWithSecrets } from '../../types';
import { ConnectorAuditAction, connectorAuditEvent } from '../../../../lib/audit_events';
import { isConnectorDeprecated } from '../../lib';
import type { GetWithSecretsParams } from './types';
import { connectorFromInMemoryConnector } from '../../lib/connector_from_in_memory_connector';
import { getAuthMode } from '../../lib/get_auth_mode';
import type { RawAction } from '../../../../types';

export async function getWithSecrets({
  context,
  id,
}: GetWithSecretsParams): Promise<ConnectorWithSecrets> {
  const { actionTypeRegistry } = context;
  try {
    await context.authorization.ensureAuthorized({ operation: 'get' });
  } catch (error) {
    context.auditLogger?.log(
      connectorAuditEvent({
        action: ConnectorAuditAction.GET,
        savedObject: { type: 'action', id },
        error,
      })
    );
    throw error;
  }

  const foundInMemoryConnector = context.inMemoryConnectors.find(
    (connector) => connector.id === id
  );

  if (foundInMemoryConnector !== undefined && foundInMemoryConnector.isSystemAction) {
    throw Boom.notFound(`Connector ${id} not found`);
  }

  if (foundInMemoryConnector !== undefined) {
    context.auditLogger?.log(
      connectorAuditEvent({
        action: ConnectorAuditAction.GET,
        savedObject: { type: 'action', id },
      })
    );

    const connector = connectorFromInMemoryConnector({
      id,
      inMemoryConnector: foundInMemoryConnector,
      actionTypeRegistry,
    });

    return { ...connector, secrets: foundInMemoryConnector.secrets as Record<string, unknown> };
  }

  const result = await getConnectorSo({
    unsecuredSavedObjectsClient: context.unsecuredSavedObjectsClient,
    id,
  });
  const authMode = getAuthMode(result.attributes.authMode as ConnectorWithSecrets['authMode'] | undefined);

  context.auditLogger?.log(
    connectorAuditEvent({
      action: ConnectorAuditAction.GET,
      savedObject: { type: 'action', id },
    })
  );

  const namespace =
    context.spaceId && context.spaceId !== 'default' ? { namespace: context.spaceId } : {};
  const raw = await context.encryptedSavedObjectsClient.getDecryptedAsInternalUser<RawAction>(
    'action',
    id,
    namespace
  );

  return {
    id,
    actionTypeId: result.attributes.actionTypeId,
    isMissingSecrets: result.attributes.isMissingSecrets,
    name: result.attributes.name,
    config: result.attributes.config,
    isPreconfigured: false,
    isSystemAction: false,
    isDeprecated: isConnectorDeprecated(result.attributes),
    isConnectorTypeDeprecated: actionTypeRegistry.isDeprecated(result.attributes.actionTypeId),
    authMode,
    secrets: (raw.attributes.secrets ?? {}) as Record<string, unknown>,
  };
}
