/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AggregationTemporality, MetricReader } from '@opentelemetry/sdk-metrics-base';
import {
  PrometheusExporter as OpenTelemetryPrometheusExporter,
  ExporterConfig,
  PrometheusSerializer,
} from '@opentelemetry/exporter-prometheus';
import { KibanaResponseFactory } from '@kbn/core/server';

export class PrometheusExporter extends MetricReader {
  private readonly prefix?: string;
  private readonly appendTimestamp: boolean;
  private serializer: PrometheusSerializer;

  constructor(config: ExporterConfig = {}) {
    super();
    this.prefix = config.prefix || OpenTelemetryPrometheusExporter.DEFAULT_OPTIONS.prefix;
    this.appendTimestamp =
      typeof config.appendTimestamp === 'boolean'
        ? config.appendTimestamp
        : OpenTelemetryPrometheusExporter.DEFAULT_OPTIONS.appendTimestamp;

    this.serializer = new PrometheusSerializer(this.prefix, this.appendTimestamp);
  }

  selectAggregationTemporality(): AggregationTemporality {
    return AggregationTemporality.CUMULATIVE;
  }

  protected onForceFlush(): Promise<void> {
    return Promise.resolve(undefined);
  }

  protected onShutdown(): Promise<void> {
    return Promise.resolve(undefined);
  }

  /**
   * Responds to incoming message with current state of all metrics.
   */
  public async exportMetrics(res: KibanaResponseFactory) {
    try {
      const collectionResult = await this.collect();
      const { resourceMetrics, errors } = collectionResult;
      if (errors.length) {
        return res.customError({
          statusCode: 500,
          body: `PrometheusExporter: Metrics collection errors ${errors}`,
        });
      }
      const result = this.serializer.serialize(resourceMetrics);
      if (result === '') {
        return res.noContent();
      }
      return res.ok({
        body: result,
      });
    } catch (error) {
      return res.customError({
        statusCode: 500,
        body: {
          message: `PrometheusExporter: Failed to export metrics ${error}`,
        },
      });
    }
  }
}
