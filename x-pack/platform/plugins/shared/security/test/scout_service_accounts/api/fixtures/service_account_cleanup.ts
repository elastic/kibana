/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';

import type { ScoutTestConfig } from '@kbn/scout';

import { createSystemIndicesEsClient, SYSTEM_INDICES_HEADERS } from './system_indices_es_client';
import { ES_SERVICE_ACCOUNT_TOKEN_NAME } from '../../../../common/service_accounts';
import { SERVICE_ACCOUNT_CREDENTIAL_TYPE } from '../../../../server/service_accounts/credentials';

/** Alias of the main saved objects index, which the credential type lands in. */
const KIBANA_INDEX = '.kibana';
/** Raw field path of an attribute on a saved object document, which nests them under the type. */
const CREDENTIAL_ACCOUNT_FIELD = `${SERVICE_ACCOUNT_CREDENTIAL_TYPE}.serviceAccountId`;

export interface ServiceAccountPrincipal {
  namespace: string;
  name: string;
}

/**
 * Removes the given Elasticsearch service accounts, their Kibana-minted tokens, and the credential
 * saved objects Kibana wrote for them. Throws when anything is left behind: these accounts are
 * cluster-scoped and some hold `superuser`, so a leak has to fail the suite instead of scrolling
 * past in the log.
 */
export const deleteServiceAccounts = async (
  esClient: Client,
  config: ScoutTestConfig,
  principals: ServiceAccountPrincipal[]
): Promise<void> => {
  const failures: string[] = [];

  for (const { namespace, name } of principals) {
    // Token first, then the account, the same order `EsServiceAccounts.rollback` uses: a forced
    // account delete can leave the token behind, and a lingering token blocks recreating the name
    // on the next run. A 404 is the expected answer for a name a failing test registered but
    // never got created.
    try {
      await esClient.transport.request(
        {
          method: 'DELETE',
          path: `/_security/service/${namespace}/${name}/credential/token/${ES_SERVICE_ACCOUNT_TOKEN_NAME}`,
        },
        { ignore: [404] }
      );
    } catch (err) {
      failures.push(
        `service account token [${namespace}/${name}/${ES_SERVICE_ACCOUNT_TOKEN_NAME}]: ${err.message}`
      );
    }

    try {
      // `force`, in case the token delete above did not land: Elasticsearch refuses an unforced
      // delete while any token remains.
      await esClient.transport.request(
        {
          method: 'DELETE',
          path: `/_security/service/${namespace}/${name}`,
          querystring: { force: 'true' },
        },
        { ignore: [404] }
      );
    } catch (err) {
      failures.push(`service account [${namespace}/${name}]: ${err.message}`);
    }
  }

  // Every successful create through Kibana also writes an encrypted credential saved object, and
  // there is no API to remove one yet, so it is deleted straight out of the index. Matching on the
  // mapped `serviceAccountId` keyword rather than re-deriving the hashed document ID keeps this
  // working if the derivation ever changes.
  //
  // `.kibana` is restricted, and the plain `esClient` authenticates as `elastic`, whose
  // `superuser` role does not reach restricted indices. The `allow_restricted_indices` role behind
  // the client below, plus the product-origin header, is what makes the delete land.
  if (principals.length > 0) {
    let systemIndicesEsClient: Client | undefined;
    try {
      systemIndicesEsClient = await createSystemIndicesEsClient(esClient, config);
      const result = await systemIndicesEsClient.deleteByQuery(
        {
          index: KIBANA_INDEX,
          refresh: true,
          conflicts: 'proceed',
          query: {
            bool: {
              filter: [
                { term: { type: SERVICE_ACCOUNT_CREDENTIAL_TYPE } },
                {
                  terms: {
                    [CREDENTIAL_ACCOUNT_FIELD]: principals.map(
                      ({ namespace, name }) => `${namespace}/${name}`
                    ),
                  },
                },
              ],
            },
          },
        },
        { headers: SYSTEM_INDICES_HEADERS }
      );
      // A partial delete still resolves, so shard-level failures only surface here.
      if (result.failures?.length) {
        failures.push(`credential saved objects: ${JSON.stringify(result.failures)}`);
      }
    } catch (err) {
      failures.push(`credential saved objects: ${err.message}`);
    } finally {
      await systemIndicesEsClient?.close();
    }
  }

  if (failures.length > 0) {
    throw new Error(`Failed to clean up service accounts:\n${failures.join('\n')}`);
  }
};
