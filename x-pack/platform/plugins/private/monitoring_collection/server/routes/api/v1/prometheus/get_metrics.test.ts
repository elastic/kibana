/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestHandlerContext } from '@kbn/core/server';
import { httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import { registerV1PrometheusRoute } from '.';
import { PrometheusExporter } from '../../../../lib';

describe('Prometheus route', () => {
  it('forwards the request to the prometheus exporter', async () => {
    const router = httpServiceMock.createRouter();
    const prometheusExporter = {
      exportMetrics: jest.fn(),
    } as Partial<PrometheusExporter> as PrometheusExporter;

    registerV1PrometheusRoute({ router, prometheusExporter });

    const [, handler] = router.get.mock.calls[0];

    const context = {} as jest.Mocked<RequestHandlerContext>;
    const req = httpServerMock.createKibanaRequest();
    const factory = httpServerMock.createResponseFactory();

    await handler(context, req, factory);

    expect(prometheusExporter.exportMetrics).toHaveBeenCalledWith(factory);
  });
});
