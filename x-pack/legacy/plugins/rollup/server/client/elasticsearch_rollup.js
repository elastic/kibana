/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const elasticsearchJsPlugin = (Client, config, components) => {
  const ca = components.clientAction.factory;

  Client.prototype.rollup = components.clientAction.namespaceFactory();
  const rollup = Client.prototype.rollup.prototype;

  rollup.rollupIndexCapabilities = ca({
    urls: [
      {
        fmt: '/<%=indexPattern%>/_rollup/data',
        req: {
          indexPattern: {
            type: 'string'
          }
        }
      }
    ],
    method: 'GET'
  });

  rollup.search = ca({
    urls: [
      {
        fmt: '/<%=index%>/_rollup_search',
        req: {
          index: {
            type: 'string'
          }
        }
      }
    ],
    needBody: true,
    method: 'POST'
  });

  rollup.fieldCapabilities = ca({
    urls: [
      {
        fmt: '/<%=indexPattern%>/_field_caps?fields=*',
        req: {
          indexPattern: {
            type: 'string'
          }
        }
      }
    ],
    method: 'GET'
  });

  rollup.jobs = ca({
    urls: [
      {
        fmt: '/_rollup/job/_all',
      }
    ],
    method: 'GET'
  });

  rollup.job = ca({
    urls: [
      {
        fmt: '/_rollup/job/<%=id%>',
        req: {
          id: {
            type: 'string'
          }
        }
      }
    ],
    method: 'GET'
  });

  rollup.startJob = ca({
    urls: [
      {
        fmt: '/_rollup/job/<%=id%>/_start',
        req: {
          id: {
            type: 'string'
          }
        }
      },
    ],
    method: 'POST'
  });

  rollup.stopJob = ca({
    params: {
      waitForCompletion: {
        type: 'boolean',
        name: 'wait_for_completion'
      }
    },
    urls: [
      {
        fmt: '/_rollup/job/<%=id%>/_stop',
        req: {
          id: {
            type: 'string'
          }
        }
      },
    ],
    method: 'POST'
  });

  rollup.deleteJob = ca({
    urls: [
      {
        fmt: '/_rollup/job/<%=id%>',
        req: {
          id: {
            type: 'string'
          }
        }
      },
    ],
    method: 'DELETE'
  });

  rollup.createJob = ca({
    urls: [
      {
        fmt: '/_rollup/job/<%=id%>',
        req: {
          id: {
            type: 'string'
          }
        }
      },
    ],
    needBody: true,
    method: 'PUT'
  });
};

