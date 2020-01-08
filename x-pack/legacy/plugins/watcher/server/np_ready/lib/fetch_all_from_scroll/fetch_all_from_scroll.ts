/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { ES_SCROLL_SETTINGS } from '../../../../common/constants';

export function fetchAllFromScroll(response: any, callWithRequest: any, hits: any[] = []) {
  const newHits = get(response, 'hits.hits', []);
  const scrollId = get(response, '_scroll_id');

  if (newHits.length > 0) {
    hits.push(...newHits);

    return callWithRequest('scroll', {
      body: {
        scroll: ES_SCROLL_SETTINGS.KEEPALIVE,
        scroll_id: scrollId,
      },
    }).then((innerResponse: any) => {
      return fetchAllFromScroll(innerResponse, callWithRequest, hits);
    });
  }

  return Promise.resolve(hits);
}
