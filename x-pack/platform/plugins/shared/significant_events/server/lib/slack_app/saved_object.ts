/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import { schema, type TypeOf } from '@kbn/config-schema';

export const RELAY_APP_CONNECTION_SO_TYPE = 'relay-app-connection';

/**
 * A single, deployment-wide connection document. The Slack workspace binding is
 * deployment-level (not per-space), so a fixed id + `agnostic` namespace is used.
 *
 * No secrets are stored here: the managed ES API key secret is handed to the Relay
 * during install, and Kibana -> Relay calls authenticate at the transport layer
 * (mTLS proxy, identity from XFCC). Only the key *id* is kept so it can be
 * invalidated on disconnect. On serverless the UIAM service account id is kept so
 * a reconnect can reuse the same account — creating a new one per connect would
 * accumulate permanent orphaned accounts with no delete API available.
 */
export const RELAY_APP_CONNECTION_SO_ID = 'relay-app-connection';

const relayAppConnectionAttributesV1 = schema.object({
  status: schema.oneOf([
    schema.literal('not_connected'),
    schema.literal('oauth_in_progress'),
    schema.literal('connected'),
    schema.literal('error'),
  ]),
  // Id of the managed ES API key minted for the Relay; kept so we can invalidate it
  // on disconnect. The secret itself is never stored (it is handed to the Relay).
  apiKeyId: schema.maybe(schema.oneOf([schema.string(), schema.literal(null)])),
  // Claim id issued at install start; required by the Relay's claim poll
  // (`parseClaimInstallInput` on relay main mandates `claim_id` in the body).
  claimId: schema.maybe(schema.string()),
  // Which external app this connection is for (e.g. 'slack').
  surface: schema.maybe(schema.string()),
  // Relay-side tenant identifier for this binding.
  tenantKey: schema.maybe(schema.oneOf([schema.string(), schema.literal(null)])),
  error: schema.maybe(schema.string()),
  createdBy: schema.maybe(schema.string()),
  createdAt: schema.maybe(schema.string()),
  updatedAt: schema.maybe(schema.string()),
});

// V2 adds `serviceAccountId` for the serverless UIAM credential path (M2). The
// account is created once and reused because there is no delete/revoke API —
// accumulating permanent accounts per reconnect would be a resource leak.
const relayAppConnectionAttributesV2 = relayAppConnectionAttributesV1.extends({
  serviceAccountId: schema.maybe(schema.oneOf([schema.string(), schema.literal(null)])),
});

export type RelayAppConnectionAttributes = TypeOf<typeof relayAppConnectionAttributesV2>;

export const getRelayAppConnectionSavedObjectType = (): SavedObjectsType => ({
  name: RELAY_APP_CONNECTION_SO_TYPE,
  hidden: true,
  namespaceType: 'agnostic',
  mappings: {
    dynamic: false,
    properties: {
      status: { type: 'keyword', ignore_above: 1024 },
      apiKeyId: { type: 'keyword', ignore_above: 1024 },
      surface: { type: 'keyword', ignore_above: 1024 },
      tenantKey: { type: 'keyword', ignore_above: 1024 },
    },
  },
  management: {
    importableAndExportable: false,
  },
  modelVersions: {
    '1': {
      changes: [],
      schemas: {
        forwardCompatibility: relayAppConnectionAttributesV1.extends({}, { unknowns: 'ignore' }),
        create: relayAppConnectionAttributesV1,
      },
    },
    '2': {
      changes: [],
      schemas: {
        forwardCompatibility: relayAppConnectionAttributesV2.extends({}, { unknowns: 'ignore' }),
        create: relayAppConnectionAttributesV2,
      },
    },
  },
});
