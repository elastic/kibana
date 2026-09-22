/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { connectorTypeHasInboundEvents, connectorTypeIsDual } from '@kbn/connector-specs';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { i18n } from '@kbn/i18n';

import type { RawAction } from '../../../../types';
import { CONNECTOR_INGRESS_CREDENTIAL_SAVED_OBJECT_TYPE } from '../../../../constants/saved_objects';
import { resolveInboundEventsSpaceId } from '../../../../inbound/resolve_inbound_events_space_id';
import { mintIngressCredential } from '../../../../inbound/ingress_credential';
import { hasInboundEventIdentityAttributes } from '../../../../inbound/event_identity/encode_api_key';
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

  if (
    connectorTypeIsDual(actionTypeId) &&
    !hasInboundEventIdentityAttributes(rawAction.attributes)
  ) {
    throw Boom.badRequest(
      i18n.translate('xpack.actions.serverSideErrors.rotateInboundIngressNotEnabled', {
        defaultMessage: 'Inbound events are not enabled for this connector.',
      })
    );
  }

  const { ingestToken, credentialId } = await mintIngressCredential({
    unsecuredSavedObjectsClient: context.unsecuredSavedObjectsClient,
    connectorId: id,
    spaceId,
    auditLogger: context.auditLogger,
    logger: context.logger,
  });

  if (connectorTypeIsDual(actionTypeId)) {
    const afterMint =
      await context.encryptedSavedObjectsClient.getDecryptedAsInternalUser<RawAction>(
        'action',
        id,
        spaceId !== DEFAULT_SPACE_ID ? { namespace: spaceId } : {}
      );
    if (!hasInboundEventIdentityAttributes(afterMint.attributes)) {
      const deletion = await context.unsecuredSavedObjectsClient.bulkDelete([
        { type: CONNECTOR_INGRESS_CREDENTIAL_SAVED_OBJECT_TYPE, id: credentialId },
      ]);
      if (deletion.statuses.some((status) => !status.success)) {
        throw new Error(
          `Failed to delete stale ingest credential "${credentialId}" for connector "${id}"`
        );
      }
      throw Boom.badRequest(
        i18n.translate('xpack.actions.serverSideErrors.rotateInboundIngressNotEnabled', {
          defaultMessage: 'Inbound events are not enabled for this connector.',
        })
      );
    }
  }

  return { ingestToken };
}
