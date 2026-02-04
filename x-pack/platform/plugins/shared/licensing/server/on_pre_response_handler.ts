/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OnPreResponseHandler } from '@kbn/core/server';
import type { ILicense } from '@kbn/licensing-types';
import type { Observable } from 'rxjs';

export function createOnPreResponseHandler(
  refresh: () => Promise<ILicense>,
  license$: Observable<ILicense>
): OnPreResponseHandler {
  let license: undefined | ILicense;
  license$.subscribe({ next: (l) => (license = l) });
  return async (req, res, t) => {
    // If we're returning an error response, refresh license info from
    // Elasticsearch in case the error is due to a change in license information
    // in Elasticsearch. https://github.com/elastic/x-pack-kibana/pull/2876
    // We're explicit ignoring a 429 "Too Many Requests". This is being used to communicate
    // that back-pressure should be applied, and we don't need to refresh the license in these
    // situations.
    if (res.statusCode >= 400 && res.statusCode !== 429) {
      // refresh() should never reject, unless we are shutting down the server before the license is fetched the first time.
      void refresh();
    }

    if (!license) {
      return t.next({
        headers: {
          'kbn-license-sig': 'unknown',
        },
      });
    }

    return t.next({
      headers: {
        'kbn-license-sig': license.signature,
      },
    });
  };
}
