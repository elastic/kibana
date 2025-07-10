/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';
import { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';
import { fetchEsQuery } from './fetch_es_query';

export interface DocStat {
  bucketKey: string[];
  percentage: number;
}

export const getDocsStats = async ({
  index,
  dateStart,
  groupBy,
  query,
  scopedClusterClient,
}: {
  index: string;
  dateStart: string;
  groupBy: string[];
  query?: {
    must: QueryDslQueryContainer | QueryDslQueryContainer[];
  };
  scopedClusterClient: IScopedClusterClient;
}): Promise<DocStat[]> => {
  const dataStreamTotalDocsResults = await fetchEsQuery({
    index,
    dateStart,
    groupBy,
    services: {
      scopedClusterClient,
    },
  });

  const dataStreamQueryDocsResults = await fetchEsQuery({
    index,
    dateStart,
    groupBy,
    query,
    services: {
      scopedClusterClient,
    },
  });

  return Object.keys(dataStreamTotalDocsResults).map((key) => {
    const totalDocs = dataStreamTotalDocsResults[key].docCount;
    const queryDocs = dataStreamQueryDocsResults[key]?.docCount ?? 0;
    const bucketKey =
      dataStreamTotalDocsResults[key]?.bucketKey ?? dataStreamQueryDocsResults[key]?.bucketKey;

    return {
      bucketKey,
      percentage: totalDocs ? (queryDocs / totalDocs) * 100 : 0,
    };
  });
};
