/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';

import { checkKafkaKerberosAllowed, checkKafkaOAuth2Allowed } from './helpers';
import type { KafkaAuthMethod, KafkaAuthOutput } from './kafka_auth';

/**
 * Checks whether an authentication method of the Kafka output is permitted in this deployment.
 * Returns { result: true } when allowed, or { result: false, error } with a human-readable reason.
 */
export const checkKafkaAuthMethodAllowed = (
  method: KafkaAuthMethod,
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract,
  output: KafkaAuthOutput
): Promise<{ result: boolean; error?: string }> =>
  method === 'kerberos'
    ? checkKafkaKerberosAllowed(
        esClient,
        soClient,
        output as { kerberos?: { auth_type?: string } | null }
      )
    : checkKafkaOAuth2Allowed(esClient, soClient);
