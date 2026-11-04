/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsUtils } from '@kbn/core/server';
import type { AuditLogger } from '@kbn/security-plugin/server';

import {
  ACTION_SAVED_OBJECT_TYPE,
  CONNECTOR_INGRESS_CREDENTIAL_SAVED_OBJECT_TYPE,
} from '../../constants/saved_objects';
import {
  IngressCredentialAuditAction,
  ingressCredentialAuditEvent,
} from '../../lib/ingress_credential_audit_events';
import { computeIngestTokenHash } from '../compute_ingest_token_hash';
import { generateIngestToken } from '../generate_ingest_token';
import { deleteIngressCredentialForConnector } from './delete_ingress_credential';
import { composeIngestToken } from './parse_ingest_token';
import type { RawConnectorIngressCredential } from './types';

export const mintIngressCredential = async ({
  unsecuredSavedObjectsClient,
  connectorId,
  spaceId,
  auditLogger,
  logger,
}: {
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
  connectorId: string;
  spaceId: string;
  auditLogger?: AuditLogger;
  logger: Logger;
}): Promise<{ ingestToken: string; credentialId: string }> => {
  const credentialId = SavedObjectsUtils.generateId();
  const secret = generateIngestToken();
  const ingestToken = composeIngestToken(credentialId, secret);
  const createdAt = new Date().toISOString();

  auditLogger?.log(
    ingressCredentialAuditEvent({
      action: IngressCredentialAuditAction.ROTATE,
      savedObject: { type: CONNECTOR_INGRESS_CREDENTIAL_SAVED_OBJECT_TYPE, id: credentialId },
      outcome: 'unknown',
    })
  );

  try {
    await unsecuredSavedObjectsClient.create<RawConnectorIngressCredential>(
      CONNECTOR_INGRESS_CREDENTIAL_SAVED_OBJECT_TYPE,
      {
        connectorId,
        ingestTokenHash: computeIngestTokenHash({
          connectorId,
          spaceId,
          token: ingestToken,
        }),
        createdAt,
      },
      {
        id: credentialId,
        references: [{ name: 'connector', type: ACTION_SAVED_OBJECT_TYPE, id: connectorId }],
      }
    );
  } catch (error) {
    auditLogger?.log(
      ingressCredentialAuditEvent({
        action: IngressCredentialAuditAction.ROTATE,
        savedObject: { type: CONNECTOR_INGRESS_CREDENTIAL_SAVED_OBJECT_TYPE, id: credentialId },
        error: error instanceof Error ? error : new Error(String(error)),
      })
    );
    throw error;
  }

  await deleteIngressCredentialForConnector({
    unsecuredSavedObjectsClient,
    connectorId,
    logger,
    keepCredentialId: credentialId,
  });

  auditLogger?.log(
    ingressCredentialAuditEvent({
      action: IngressCredentialAuditAction.ROTATE,
      savedObject: { type: CONNECTOR_INGRESS_CREDENTIAL_SAVED_OBJECT_TYPE, id: credentialId },
    })
  );

  return { ingestToken, credentialId };
};
