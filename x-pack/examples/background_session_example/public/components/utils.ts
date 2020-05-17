/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreStart } from 'kibana/public';
import { DataPublicPluginStart, METRIC_TYPES } from '../../../../../src/plugins/data/public';

export const getRequest = async (
  data: DataPublicPluginStart,
  indexPatternId: string
): Promise<any> => {
  const indexPattern = await data.indexPatterns.get(indexPatternId);
  return {
    params: {
      index: indexPattern.title,
      body: {
        aggs: {
          avg_bytes: { avg: { field: 'bytes' } },
        },
      },
    },
  };
};

export const doMyCustomSearch = async (
  http: CoreStart['http'],
  sessionId: string,
  wordCount: string
) => {
  return await http.post({
    path: `/api/background_session_example/example`,
    body: JSON.stringify({
      sessionId,
      wordCount,
    }),
  });
};

export const getAggConfig = async (data: DataPublicPluginStart, indexPatternId: string) => {
  const indexPattern = await data.indexPatterns.get(indexPatternId);
  const aggConfigs = data.search.aggs.createAggConfigs(indexPattern);
  return function() {
    aggConfigs.createAggConfig({
      enabled: true,
      type: METRIC_TYPES.MAX,
      params: {
        field: 'bytes',
      },
    });
    return aggConfigs.toDsl();
  };
};
