/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { IScopedClusterClient } from '@kbn/core/server';
import { get } from 'lodash';
import { ES_SCROLL_SETTINGS } from '../../../common/constants';

export function fetchAllFromScroll(
  searchResults: estypes.ScrollResponse<unknown>,
  dataClient: IScopedClusterClient,
  hits: estypes.SearchHit[] = []
): Promise<estypes.ScrollResponse['hits']['hits']> {
  const newHits = get(searchResults, 'hits.hits', []);
  const scrollId = get(searchResults, '_scroll_id');

  if (newHits.length > 0) {
    hits.push(...newHits);

    return dataClient.asCurrentUser
      .scroll({
        scroll: ES_SCROLL_SETTINGS.KEEPALIVE,
        scroll_id: scrollId!,
      })
      .then((innerResponse) => {
        return fetchAllFromScroll(innerResponse, dataClient, hits);
      });
  }

  return Promise.resolve(hits);
}
