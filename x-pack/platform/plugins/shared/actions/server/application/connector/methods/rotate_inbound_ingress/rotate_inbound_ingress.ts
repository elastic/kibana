/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { connectorTypeHasInboundEvents } from '@kbn/connector-specs';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { i18n } from '@kbn/i18n';
import { isUndefined, omitBy } from 'lodash';

import type { RawAction } from '../../../../types';
import { ConnectorAuditAction, connectorAuditEvent } from '../../../../lib/audit_events';
import { tryCatch } from '../../../../lib';
import {
  applyInboundIngressCredentialsIfNeeded,
  resolveInboundEventsSpaceId,
} from '../../../../inbound/ensure_connector_ingress_credentials';
import type { RotateInboundIngressParams, RotateInboundIngressResult } from './types';

export async function rotateInboundIngress({
  context,
  id,
}: RotateInboundIngressParams): Promise<RotateInboundIngressResult> {
  await context.authorization.ensureAuthorized({ operation: 'update' });

  const spaceId = resolveInboundEventsSpaceId(context);
  const rawAction = await context.encryptedSavedObjectsClient.getDecryptedAsInternalUser<RawAction>(
    'action',
    id,
    spaceId !== DEFAULT_SPACE_ID ? { namespace: spaceId } : {}
  );

  const actionTypeId = rawAction.attributes.actionTypeId;
  if (!connectorTypeHasInboundEvents(actionTypeId)) {
    throw Boom.badRequest(
      i18n.translate('xpack.actions.serverSideErrors.rotateInboundIngressNotSupported', {
        defaultMessage: 'This connector does not use inbound ingest credentials.',
      })
    );
  }

  const storedConfig = (rawAction.attributes.config ?? {}) as Record<string, unknown>;
  const { config, ingestToken } = applyInboundIngressCredentialsIfNeeded({
    actionTypeId,
    connectorId: id,
    spaceId,
    config: storedConfig,
    storedConfig,
    forceMint: true,
  });

  if (ingestToken === undefined) {
    throw Boom.badImplementation(
      i18n.translate('xpack.actions.rotateInboundIngress.missingMintedToken', {
        defaultMessage: 'Rotate did not return an ingest token.',
      })
    );
  }

  context.auditLogger?.log(
    connectorAuditEvent({
      action: ConnectorAuditAction.UPDATE,
      savedObject: { type: 'action', id },
      outcome: 'unknown',
    })
  );

  const { references, version } = rawAction;
  const result = await tryCatch(
    async () =>
      await context.unsecuredSavedObjectsClient.create<RawAction>(
        'action',
        {
          ...rawAction.attributes,
          config,
          secrets: rawAction.attributes.secrets,
        },
        omitBy(
          {
            id,
            overwrite: true,
            references,
            version,
          },
          isUndefined
        )
      )
  );

  if (result instanceof Error) {
    context.auditLogger?.log(
      connectorAuditEvent({
        action: ConnectorAuditAction.UPDATE,
        savedObject: { type: 'action', id },
        error: result,
      })
    );
    throw result;
  }

  await context.evictClientPool?.(id);

  return { ingestToken };
}
