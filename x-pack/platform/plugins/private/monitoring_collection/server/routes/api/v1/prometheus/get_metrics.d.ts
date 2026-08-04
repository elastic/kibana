import type { IRouter } from '@kbn/core/server';
import type { PrometheusExporter } from '@kbn/metrics';
export declare const PROMETHEUS_PATH = "/api/monitoring_collection/v1/prometheus";
export declare function registerV1PrometheusRoute({ router, prometheusExporter, }: {
    router: IRouter;
    prometheusExporter: PrometheusExporter;
}): void;
