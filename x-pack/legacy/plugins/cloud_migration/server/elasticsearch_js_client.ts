/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const elasticSearchJsClient = (Client: any, config: any, components: any) => {
  const actionFactory = components.clientAction.factory;

  Client.prototype.cloudMigration = components.clientAction.namespaceFactory();
  const cloudMigration = Client.prototype.cloudMigration.prototype;

  cloudMigration.clusterStats = actionFactory({
    urls: [
      {
        fmt: '_cluster/stats',
      },
    ],
    method: 'GET',
  });
};
