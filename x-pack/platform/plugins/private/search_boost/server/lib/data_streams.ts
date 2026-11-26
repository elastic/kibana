/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { IScopedClusterClient } from '@kbn/core/server';
import { emptyIfForbidden } from './es_errors';

/** None without the privileges to read them. */
export const getDataStreams = async (
  client: IScopedClusterClient
): Promise<estypes.IndicesDataStream[]> => {
  const { data_streams: dataStreams } = await emptyIfForbidden(
    client.asCurrentUser.indices.getDataStream({ name: '*', expand_wildcards: ['open', 'hidden'] }),
    { data_streams: [] }
  );
  return dataStreams;
};
