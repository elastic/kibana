/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const initServerWithKibana = (hapiServer: any) => {
  hapiServer.route({
    method: 'GET',
    path: '/api/fleet/load',
    handler: (request: any, h: any) => {
      return 'Hello World!';
    },
  });
};
