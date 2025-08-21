/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { JsonObject } from '@kbn/utility-types';
import type {
  CoreSetup,
  Plugin,
  PluginInitializerContext,
  Logger,
  ServiceStatus,
} from '@kbn/core/server';
import type { MakeSchemaFrom } from '@kbn/usage-collection-plugin/server';
import { PrometheusExporter } from '@kbn/metrics';
import type { MonitoringCollectionConfig } from './config';
import { registerDynamicRoute, registerV1PrometheusRoute, PROMETHEUS_PATH } from './routes';
import { TYPE_ALLOWLIST } from './constants';

export interface MonitoringCollectionSetup {
  registerMetric: <T>(metric: Metric<T>) => void;
}

export type MetricResult<T> = T & JsonObject;

export interface Metric<T> {
  type: string;
  schema: MakeSchemaFrom<T>;
  fetch: () => Promise<MetricResult<T> | Array<MetricResult<T>>>;
}

export class MonitoringCollectionPlugin implements Plugin<MonitoringCollectionSetup, void, {}, {}> {
  private readonly initializerContext: PluginInitializerContext;
  private readonly logger: Logger;
  private readonly config: MonitoringCollectionConfig;

  private metrics: Record<string, Metric<any>> = {};

  private prometheusExporter?: PrometheusExporter;

  constructor(initializerContext: PluginInitializerContext<MonitoringCollectionConfig>) {
    this.initializerContext = initializerContext;
    this.logger = initializerContext.logger.get();
    this.config = initializerContext.config.get();
  }

  async getMetric(type: string) {
    if (Object.hasOwn(this.metrics, type)) {
      return await this.metrics[type].fetch();
    }
    this.logger.warn(`Call to 'getMetric' failed because type '${type}' does not exist.`);
    return undefined;
  }

  setup(core: CoreSetup) {
    const router = core.http.createRouter();
    const kibanaIndex = core.savedObjects.getDefaultIndex();
    const server = core.http.getServerInfo();
    const uuid = this.initializerContext.env.instanceUuid;
    const kibanaVersion = this.initializerContext.env.packageInfo.version;

    if (this.config.opentelemetry?.metrics.prometheus.enabled) {
      // Add Prometheus exporter
      this.logger.debug(`Starting prometheus exporter at ${PROMETHEUS_PATH}`);
      this.prometheusExporter = PrometheusExporter.get();
    }

    let status: ServiceStatus<unknown>;
    core.status.overall$.subscribe((newStatus) => {
      status = newStatus;
    });

    if (this.prometheusExporter) {
      registerV1PrometheusRoute({ router, prometheusExporter: this.prometheusExporter });
    }

    registerDynamicRoute({
      router,
      config: {
        kibanaIndex,
        kibanaVersion,
        server,
        uuid,
      },
      getStatus: () => status,
      getMetric: async (type: string) => {
        return await this.getMetric(type);
      },
    });

    return {
      registerMetric: <T>(metric: Metric<T>) => {
        if (Object.hasOwn(this.metrics, metric.type)) {
          this.logger.warn(
            `Skipping registration of metric type '${metric.type}'. This type has already been registered.`
          );
          return;
        }
        if (!TYPE_ALLOWLIST.includes(metric.type)) {
          this.logger.warn(
            `Skipping registration of metric type '${metric.type}'. This type is not supported in the allowlist.`
          );
          return;
        }
        this.metrics[metric.type] = metric;
      },
    };
  }

  start() {}

  stop() {}
}
