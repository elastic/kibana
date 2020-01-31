/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import { ROUTES } from '../../../common/constants';
import { GrokdebuggerResponse } from 'plugins/grokdebugger/models/grokdebugger_response';

export class GrokdebuggerService {
  constructor($http) {
    this.$http = $http;
    this.basePath = chrome.addBasePath(ROUTES.API_ROOT);
  }

  simulate(grokdebuggerRequest) {
    return this.$http
      .post(`${this.basePath}/simulate`, grokdebuggerRequest.upstreamJSON)
      .then(response => {
        return GrokdebuggerResponse.fromUpstreamJSON(response.data.grokdebuggerResponse);
      })
      .catch(e => {
        throw e.data.message;
      });
  }
}
