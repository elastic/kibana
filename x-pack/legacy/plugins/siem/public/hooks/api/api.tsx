/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npStart } from 'ui/new_platform';
import * as i18n from '../translations';
import { parseJsonFromBody, ToasterErrors } from '../../components/ml/api/throw_if_not_ok';
import { IndexPatternResponse, IndexPatternSavedObject } from '../types';

const emptyIndexPattern: IndexPatternSavedObject[] = [];

/**
 * Fetches Configured Index Patterns from the Kibana saved objects API
 *
 * TODO: Refactor to context provider: https://github.com/elastic/siem-team/issues/448
 *
 * @param signal
 */
export const getIndexPatterns = async (signal: AbortSignal): Promise<IndexPatternSavedObject[]> => {
  // TODO: Refactor to use savedObjects client
  const response = await npStart.core.http.fetch<IndexPatternResponse>('/api/saved_objects/_find', {
    query: {
      type: 'index-pattern',
      fields: 'title',
      per_page: 10000,
    },
    method: 'GET',
    credentials: 'same-origin',
    headers: { 'kbn-system-api': 'true' },
    signal,
    asResponse: true,
  });

  await throwIfNotOk(response.response!);
  const results = response.body!;

  if (Array.isArray(results.saved_objects)) {
    return results.saved_objects;
  } else {
    return emptyIndexPattern;
  }
};

export const throwIfNotOk = async (response: Response): Promise<void> => {
  if (!response.ok) {
    const body = await parseJsonFromBody(response);
    if (body != null && body.message) {
      if (body.statusCode != null) {
        throw new ToasterErrors([body.message, `${i18n.STATUS_CODE} ${body.statusCode}`]);
      } else {
        throw new ToasterErrors([body.message]);
      }
    } else {
      throw new ToasterErrors([`${i18n.NETWORK_ERROR} ${response.statusText}`]);
    }
  }
};
