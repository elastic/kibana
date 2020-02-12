/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';

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
  const response = await fetch(
    `${chrome.getBasePath()}/api/saved_objects/_find?type=index-pattern&fields=title&fields=type&per_page=10000`,
    {
      method: 'GET',
      credentials: 'same-origin',
      headers: {
        'content-type': 'application/json',
        'kbn-system-api': 'true',
        'kbn-xsrf': 'true',
      },
      signal,
    }
  );
  await throwIfNotOk(response);
  const results: IndexPatternResponse = await response.json();

  if (results.saved_objects && Array.isArray(results.saved_objects)) {
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
      } else if (body.status_code != null) {
        throw new ToasterErrors([body.message, `${i18n.STATUS_CODE} ${body.status_code}`]);
      } else {
        throw new ToasterErrors([body.message]);
      }
    } else {
      throw new ToasterErrors([`${i18n.NETWORK_ERROR} ${response.statusText}`]);
    }
  }
};
