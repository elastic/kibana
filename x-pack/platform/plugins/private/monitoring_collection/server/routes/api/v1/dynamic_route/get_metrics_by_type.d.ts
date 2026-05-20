import type { JsonObject } from '@kbn/utility-types';
import type { IRouter, ServiceStatus } from '@kbn/core/server';
import type { MetricResult } from '../../../../plugin';
export declare function registerDynamicRoute({ router, config, getStatus, getMetric, }: {
    router: IRouter;
    config: {
        kibanaIndex: string;
        kibanaVersion: string;
        uuid: string;
        server: {
            name: string;
            hostname: string;
            port: number;
        };
    };
    getStatus: () => ServiceStatus<unknown> | undefined;
    getMetric: (type: string) => Promise<Array<MetricResult<JsonObject>> | MetricResult<JsonObject> | undefined>;
}): void;
