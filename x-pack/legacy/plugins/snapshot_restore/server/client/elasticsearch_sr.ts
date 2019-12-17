/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const elasticsearchJsPlugin = (Client: any, config: any, components: any) => {
  const ca = components.clientAction.factory;

  Client.prototype.sr = components.clientAction.namespaceFactory();
  const sr = Client.prototype.sr.prototype;

  sr.policies = ca({
    urls: [
      {
        fmt: '/_slm/policy',
      },
    ],
    method: 'GET',
  });

  sr.policy = ca({
    urls: [
      {
        fmt: '/_slm/policy/<%=name%>',
        req: {
          name: {
            type: 'string',
          },
        },
      },
    ],
    method: 'GET',
  });

  sr.deletePolicy = ca({
    urls: [
      {
        fmt: '/_slm/policy/<%=name%>',
        req: {
          name: {
            type: 'string',
          },
        },
      },
    ],
    method: 'DELETE',
  });

  sr.executePolicy = ca({
    urls: [
      {
        fmt: '/_slm/policy/<%=name%>/_execute',
        req: {
          name: {
            type: 'string',
          },
        },
      },
    ],
    method: 'PUT',
  });

  sr.updatePolicy = ca({
    urls: [
      {
        fmt: '/_slm/policy/<%=name%>',
        req: {
          name: {
            type: 'string',
          },
        },
      },
    ],
    method: 'PUT',
  });

  sr.executeRetention = ca({
    urls: [
      {
        fmt: '/_slm/_execute_retention',
      },
    ],
    method: 'POST',
  });

  sr.cleanupRepository = ca({
    urls: [
      {
        fmt: '/_snapshot/<%=name%>/_cleanup',
        req: {
          name: {
            type: 'string',
          },
        },
      },
    ],
    method: 'POST',
  });
};
