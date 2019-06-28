/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Watch } from 'plugins/watcher/models/watch';
import { ROUTES } from '../../../common/constants';
import { npStart } from 'ui/new_platform';
const { http } = npStart.core;

export const watches = {
  async getWatchList() {
    const { watches } = await http.get(`${ROUTES.API_ROOT}/watches`);
    return watches.map(Watch.fromUpstreamJson);
  },

  /**
   * Delete a collection of watches
   *
   * @param watchIds Array of watch IDs
   * @return Promise { numSuccesses, numErrors }
   */
  async deleteWatches(watchIds) {
    // $http.delete does not take the request body as the 2nd argument. Instead it expects the 2nd
    // argument to be a request options object, one of which can be the request body (data). We also
    // need to explicitly define the content type of the data.
    const { results }  = await http.post(`${ROUTES.API_ROOT}/watches/delete`, {
      body: JSON.stringify({ watchIds })
    });
    return results;
  }
};
