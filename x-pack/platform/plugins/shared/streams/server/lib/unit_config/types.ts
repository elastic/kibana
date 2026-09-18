/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit } from '@kbn/streams-schema';

/**
 * One credential as the config-distributor `PUT /v1/units/{id}` sidecar expects:
 * a name referenced from authored unit YAML, and ciphertext under the project
 * public key. Plaintext never appears in `unit_yaml`.
 */
export interface UnitCredential {
  name: string;
  ciphertext: string;
}

export interface PublishUnitConfigParams {
  unitId: string;
  unit: StreamsUnit.Configuration;
  secrets: StreamsUnit.Secrets;
}

export type PublishUnitConfig = (params: PublishUnitConfigParams) => Promise<void>;

export type EncryptUnitCredentials = (secrets: StreamsUnit.Secrets) => Promise<UnitCredential[]>;

/**
 * Backend-owned unit config steps. The config-distributor client supplies
 * `validate` and `publish`.
 */
export interface UnitConfigHooks {
  /**
   * Semantic / graph validation via config-distributor `POST /v1/validate`.
   * Called after structural checks and before the configuration saved object
   * is written. Throw to reject the PUT. Credentials are not required.
   */
  validate?: (unit: StreamsUnit.Configuration) => Promise<void>;
  /**
   * Publish the unit to config-distributor `PUT /v1/units/{id}` after the
   * configuration saved object is written.
   */
  publish?: PublishUnitConfig;
  /**
   * Outbound transform: encrypt each named secret under the project public
   * key for the distributor `credentials[]` sidecar. Does not rewrite `unit`.
   * Kibana at-rest protection is Encrypted Saved Objects on `secrets`.
   * TODO: Needs implementation once we can hook up the encryption with the project key.
   */
  encryptCredentials?: EncryptUnitCredentials;
}
