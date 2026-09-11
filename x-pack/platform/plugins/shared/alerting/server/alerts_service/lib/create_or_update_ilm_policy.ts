/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IlmPolicy } from '@elastic/elasticsearch/lib/api/types';
import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import { omit } from 'lodash';
import { retryTransientEsErrors } from '../../lib/retry_transient_es_errors';
import type { DataStreamAdapter } from './data_stream_adapter';
import { computeResourceHash, RESOURCE_CONTENT_HASH_META_FIELD } from './resource_hash';

interface CreateOrUpdateIlmPolicyOpts {
  logger: Logger;
  esClient: ElasticsearchClient;
  name: string;
  policy: IlmPolicy;
  dataStreamAdapter: DataStreamAdapter;
}

/**
 * Reads the content hash stamped in `_meta` on the currently-installed ILM
 * policy, or `undefined` if the policy does not exist, carries no stamp, or
 * cannot be read.
 */
const getInstalledIlmPolicyHash = async (
  esClient: ElasticsearchClient,
  name: string,
  logger: Logger
): Promise<string | undefined> => {
  try {
    const response = await retryTransientEsErrors(() => esClient.ilm.getLifecycle({ name }), {
      logger,
    });
    const meta = response?.[name]?.policy?._meta;
    return meta?.[RESOURCE_CONTENT_HASH_META_FIELD];
  } catch (err) {
    // Any failure reading the installed hash (404, permissions, exhausted
    // retries) leaves the installed content unknown, which falls through to the
    // PUT. The check must never block an install that would otherwise succeed.
    logger.debug(
      `Could not read installed ILM policy ${name} content hash; will install (${err.message})`
    );
    return undefined;
  }
};

/**
 * Creates ILM policy if it doesn't already exist, updates it if it does
 */
export const createOrUpdateIlmPolicy = async ({
  logger,
  esClient,
  name,
  policy,
  dataStreamAdapter,
}: CreateOrUpdateIlmPolicyOpts) => {
  if (dataStreamAdapter.isUsingDataStreams()) return;

  logger.debug(`Installing ILM policy ${name}`);

  // Stamp the content hash (over the policy body, excluding `_meta`) so a later
  // install can detect an unchanged policy and skip the write.
  const contentHash = computeResourceHash(omit(policy, '_meta'));
  const stampedPolicy: IlmPolicy = {
    ...policy,
    _meta: {
      ...policy._meta,
      [RESOURCE_CONTENT_HASH_META_FIELD]: contentHash,
    },
  };

  try {
    // Skip only on a positive hash match; any missing stamp / error falls through to the PUT.
    const installedHash = await getInstalledIlmPolicyHash(esClient, name, logger);
    if (installedHash === contentHash) {
      logger.debug(`Skipping install of ILM policy ${name}; content unchanged (${contentHash})`);
      return;
    }

    await retryTransientEsErrors(() => esClient.ilm.putLifecycle({ name, policy: stampedPolicy }), {
      logger,
    });
  } catch (err) {
    logger.error(`Error installing ILM policy ${name} - ${err.message}`);
    throw err;
  }
};
