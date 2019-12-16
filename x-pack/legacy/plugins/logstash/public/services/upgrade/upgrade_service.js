/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import { ROUTES } from '../../../common/constants';

export class UpgradeService {
  constructor($http) {
    this.$http = $http;
    this.basePath = chrome.addBasePath(ROUTES.API_ROOT);
  }

  executeUpgrade() {
    return this.$http
      .post(`${this.basePath}/upgrade`)
      .then(response => response.data.is_upgraded)
      .catch(e => {
        throw e.data.message;
      });
  }
}
