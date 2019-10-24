/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const elasticsearchJsPlugin = (Client: any, config: any, components: any) => {
  const ca = components.clientAction.factory;

  Client.prototype.transform = components.clientAction.namespaceFactory();
  const transform = Client.prototype.transform.prototype;

  // Currently the endpoint uses a default size of 100 unless a size is supplied.
  // So until paging is supported in the UI, explicitly supply a size of 1000
  // to match the max number of docs that the endpoint can return.
  transform.getTransforms = ca({
    urls: [
      {
        fmt: '/_transform/<%=transformId%>',
        req: {
          transformId: {
            type: 'string',
          },
        },
      },
      {
        fmt: '/_transform/_all?size=1000',
      },
    ],
    method: 'GET',
  });

  transform.getTransformsStats = ca({
    urls: [
      {
        fmt: '/_transform/<%=transformId%>/_stats',
        req: {
          transformId: {
            type: 'string',
          },
        },
      },
      {
        // Currently the endpoint uses a default size of 100 unless a size is supplied.
        // So until paging is supported in the UI, explicitly supply a size of 1000
        // to match the max number of docs that the endpoint can return.
        fmt: '/_transform/_all/_stats?size=1000',
      },
    ],
    method: 'GET',
  });

  transform.createTransform = ca({
    urls: [
      {
        fmt: '/_transform/<%=transformId%>',
        req: {
          transformId: {
            type: 'string',
          },
        },
      },
    ],
    needBody: true,
    method: 'PUT',
  });

  transform.deleteTransform = ca({
    urls: [
      {
        fmt: '/_transform/<%=transformId%>',
        req: {
          transformId: {
            type: 'string',
          },
        },
      },
    ],
    method: 'DELETE',
  });

  transform.getTransformsPreview = ca({
    urls: [
      {
        fmt: '/_transform/_preview',
      },
    ],
    needBody: true,
    method: 'POST',
  });

  transform.startTransform = ca({
    urls: [
      {
        fmt: '/_transform/<%=transformId%>/_start',
        req: {
          transformId: {
            type: 'string',
          },
        },
      },
    ],
    method: 'POST',
  });

  transform.stopTransform = ca({
    urls: [
      {
        fmt:
          '/_transform/<%=transformId%>/_stop?&force=<%=force%>&wait_for_completion=<%waitForCompletion%>',
        req: {
          transformId: {
            type: 'string',
          },
          force: {
            type: 'boolean',
          },
          waitForCompletion: {
            type: 'boolean',
          },
        },
      },
    ],
    method: 'POST',
  });
};
