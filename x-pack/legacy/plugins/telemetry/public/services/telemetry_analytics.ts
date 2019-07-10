/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createReporter } from '@kbn/analytics';

export function createAnalyticsReporter({ localStorage, $http }: { localStorage: any, $http: any }) {
  // const localStorage = $injector.get('localStorage');
  // const $http = $injector.get('storage');
  return createReporter({
    storage: localStorage,
    debug: true,
    async http(reports) {
      console.log('reports::', reports)
      $http
    }
  });
}
