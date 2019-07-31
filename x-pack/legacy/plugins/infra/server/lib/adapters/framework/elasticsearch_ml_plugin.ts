/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const elasticsearchMlPlugin = (
  Client: any,
  _config: object,
  { clientAction: { factory: createClientAction, namespaceFactory: createNamespace } }: any
) => {
  Client.prototype.ml = createNamespace();
  const ml = Client.prototype.ml.prototype;

  /**
   * Result buckets
   */

  ml.getBuckets = createClientAction({
    urls: [
      {
        fmt: '/_ml/anomaly_detectors/<%=jobId%>/results/buckets',
        req: {
          jobId: {
            type: 'string',
          },
        },
      },
    ],
    method: 'POST',
    needBody: true,
  });
};
