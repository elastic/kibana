/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const elasticsearchJsPlugin = (Client: any, config: any, components: any) => {
  const ca = components.clientAction.factory;

  Client.prototype.slm = components.clientAction.namespaceFactory();
  const slm = Client.prototype.slm.prototype;

  slm.policies = ca({
    urls: [
      {
        fmt: '/_slm/policy',
      },
    ],
    method: 'GET',
  });

  slm.policy = ca({
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

  slm.deletePolicy = ca({
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

  slm.executePolicy = ca({
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

  slm.updatePolicy = ca({
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

  slm.stats = ca({
    urls: [
      {
        fmt: '/_slm/stats',
      },
    ],
    method: 'GET',
  });
};
