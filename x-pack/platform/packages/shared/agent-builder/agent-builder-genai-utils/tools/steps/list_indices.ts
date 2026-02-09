/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

export interface ListIndexBasicInfo {
  index: string;
  docsCount: number;
}

export interface ListIndexDetailInfo extends ListIndexBasicInfo {
  status: string;
  health: string;
  uuid: string;
  primaries: number;
  replicas: number;
}

interface ListIndicesOptions {
  pattern?: string;
  includeHidden?: boolean;
  includeKibanaIndices?: boolean;
  listAllIfNoResults?: boolean;
  showDetails?: boolean;
  esClient: ElasticsearchClient;
}

type ListIndexResult<T extends ListIndicesOptions> = T['showDetails'] extends true
  ? ListIndexDetailInfo[]
  : ListIndexBasicInfo[];

const kibanaIndicesExclusionPattern = '-.*';

export const listIndices = async <const T extends ListIndicesOptions>({
  pattern = '*',
  includeHidden = false,
  includeKibanaIndices = false,
  listAllIfNoResults = false,
  showDetails = false,
  esClient,
}: T): Promise<ListIndexResult<T>> => {
  let response = await esClient.cat.indices({
    index: includeKibanaIndices ? [pattern] : [pattern, kibanaIndicesExclusionPattern],
    expand_wildcards: includeHidden ? ['open', 'hidden'] : ['open'],
    format: 'json',
  });

  if (response.length === 0 && listAllIfNoResults) {
    response = await esClient.cat.indices({
      index: includeKibanaIndices ? ['*'] : ['*', kibanaIndicesExclusionPattern],
      expand_wildcards: includeHidden ? ['open', 'hidden'] : ['open'],
      format: 'json',
    });
  }

  if (showDetails) {
    const result = response.map(
      ({ index, status, health, uuid, 'docs.count': docsCount, pri, rep }) => ({
        index: index ?? 'unknown',
        status: status ?? 'unknown',
        health: health ?? 'unknown',
        uuid: uuid ?? 'unknown',
        docsCount: parseInt(docsCount ?? '0', 10),
        primaries: parseInt(pri ?? '1', 10),
        replicas: parseInt(rep ?? '0', 10),
      })
    );
    return result as ListIndexResult<T>;
  } else {
    const result = response.map(({ index, status, 'docs.count': docsCount }) => ({
      index: index ?? 'unknown',
      docsCount: parseInt(docsCount ?? '0', 10),
    }));
    return result as ListIndexResult<T>;
  }
};
