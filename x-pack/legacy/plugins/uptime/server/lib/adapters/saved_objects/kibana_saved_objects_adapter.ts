/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { APICaller } from 'kibana/server';
import { UMSavedObjectsAdapter } from './types';
import {
  IndexPatternsFetcher,
  IIndexPattern,
} from '../../../../../../../../src/plugins/data/server';

export const savedObjectsAdapter: UMSavedObjectsAdapter = {
  getUptimeIndexPattern: async callES => {
    const indexPatternTitle = 'heartbeat-8*';

    const indexPatternsFetcher = new IndexPatternsFetcher((...rest: Parameters<APICaller>) =>
      callES(...rest)
    );

    // Since `getDynamicIndexPattern` is called in setup_request (and thus by every endpoint)
    // and since `getFieldsForWildcard` will throw if the specified indices don't exist,
    // we have to catch errors here to avoid all endpoints returning 500 for users without APM data
    // (would be a bad first time experience)
    try {
      const fields = await indexPatternsFetcher.getFieldsForWildcard({
        pattern: 'heartbeat-8*',
      });

      const indexPattern: IIndexPattern = {
        fields,
        title: indexPatternTitle,
      };

      return indexPattern;
    } catch (e) {
      const notExists = e.output?.statusCode === 404;
      if (notExists) {
        // eslint-disable-next-line no-console
        console.error(
          `Could not get dynamic index pattern because indices "${indexPatternTitle}" don't exist`
        );
        return;
      }

      // re-throw
      throw e;
    }
  },
};
