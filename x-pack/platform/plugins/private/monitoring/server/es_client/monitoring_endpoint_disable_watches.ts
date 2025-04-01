/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function monitoringEndpointDisableWatches(Client: any, _config: any, components: any) {
  const ca = components.clientAction.factory;
  Client.prototype.monitoring = components.clientAction.namespaceFactory();
  const monitoring = Client.prototype.monitoring.prototype;
  monitoring.disableWatches = ca({
    params: {},
    urls: [
      {
        fmt: '/_monitoring/migrate/alerts',
      },
    ],
    method: 'POST',
  });
}
