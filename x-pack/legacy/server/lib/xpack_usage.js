/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function xpackUsage(client) {
  /*
   * Get an object over the Usage API that as available/enabled data and some
   * select metadata for each of the X-Pack UI plugins
   */
  return client.transport.request({
    method: 'GET',
    path: '/_xpack/usage',
  });
}
