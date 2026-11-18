/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Server } from '@hapi/hapi';
import { duration } from 'moment';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { metrics as metricsApi } from '@opentelemetry/api';
import { initMetrics, PrometheusExporter } from '@kbn/metrics';
import { monitoringCollectionSchema } from '@kbn/metrics-config';
import {
  HapiResponseAdapter,
  KibanaResponse,
  kibanaResponseFactory,
} from '@kbn/core-http-router-server-internal';

/** Scrapes the genuine native exporter through Kibana's real response factory and Hapi adapter. */
export const createNativePrometheusCollector = async (): Promise<{
  exporter: PrometheusExporter;
  scrape: () => Promise<string>;
  stop: () => Promise<void>;
}> => {
  const lifecycle = await initMetrics({
    resource: resourceFromAttributes({
      'service.name': 'kibana',
      'service.instance.id': 'prometheus-main',
    }),
    metricsConfig: { enabled: false, exporters: [], interval: duration(1, 'hour') },
    monitoringCollectionConfig: monitoringCollectionSchema.validate({
      enabled: true,
      opentelemetry: { metrics: { prometheus: { enabled: true }, otlp: { url: '' } } },
    }),
  });
  const exporter = PrometheusExporter.get();
  const server = new Server({ host: '127.0.0.1', port: 0 });
  server.route({
    method: 'GET',
    path: '/api/_monitoring/v1/prometheus',
    handler: async (_request, response) => {
      const result = await exporter.exportMetrics(kibanaResponseFactory);
      if (!(result instanceof KibanaResponse)) throw new Error('Expected a native Kibana response');
      return new HapiResponseAdapter(response).handle(result);
    },
  });
  await server.start();
  return {
    exporter,
    scrape: async () => {
      const response = await fetch(`${server.info.uri}/api/_monitoring/v1/prometheus`);
      const body = await response.text();
      if (!response.ok) throw new Error(`Native Prometheus scrape failed: ${body}`);
      return body;
    },
    stop: async () => {
      await server.stop();
      await lifecycle.shutdown();
      PrometheusExporter.destroy();
      metricsApi.disable();
    },
  };
};
