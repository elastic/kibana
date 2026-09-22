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

import type { RawAction } from '../../../../types';
import { resolveInboundEventsSpaceId } from '../../../../inbound/resolve_inbound_events_space_id';
import { mintIngressCredential } from '../../../../inbound/ingress_credential';
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

  const { ingestToken } = await mintIngressCredential({
    unsecuredSavedObjectsClient: context.unsecuredSavedObjectsClient,
    connectorId: id,
    spaceId,
    auditLogger: context.auditLogger,
    logger: context.logger,
  });

  return { ingestToken };
}
