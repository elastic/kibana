/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as i18n from '../translations';
import { StartServices } from '../../plugin';
import { parseJsonFromBody } from '../../components/ml/api/throw_if_not_ok';
import { IndexPatternSavedObject, IndexPatternSavedObjectAttributes } from '../types';
import { ToasterError } from '../../components/toasters';

/**
 * Fetches Configured Index Patterns from the Kibana saved objects API
 *
 * TODO: Refactor to context provider: https://github.com/elastic/siem-team/issues/448
 */
export const getIndexPatterns = async (
  savedObjects: StartServices['savedObjects']
): Promise<IndexPatternSavedObject[]> => {
  const response = await savedObjects.client.find<IndexPatternSavedObjectAttributes>({
    type: 'index-pattern',
    fields: ['title'],
    perPage: 10000,
  });

  return response.savedObjects;
};

export const throwIfNotOk = async (response?: Response): Promise<void> => {
  if (!response) {
    throw new ToasterError([i18n.NETWORK_ERROR]);
  }

  if (!response.ok) {
    const body = await parseJsonFromBody(response);
    if (body != null && body.message) {
      if (body.statusCode != null) {
        throw new ToasterError([body.message, `${i18n.STATUS_CODE} ${body.statusCode}`]);
      } else if (body.status_code != null) {
        throw new ToasterError([body.message, `${i18n.STATUS_CODE} ${body.status_code}`]);
      } else {
        throw new ToasterError([body.message]);
      }
    } else {
      throw new ToasterError([`${i18n.NETWORK_ERROR} ${response.statusText}`]);
    }
  }
};
