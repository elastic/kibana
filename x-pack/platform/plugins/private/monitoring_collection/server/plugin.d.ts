import type { JsonObject } from '@kbn/utility-types';
import type { CoreSetup, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { MakeSchemaFrom } from '@kbn/usage-collection-plugin/server';
import type { MonitoringCollectionConfig } from './config';
export interface MonitoringCollectionSetup {
    registerMetric: <T>(metric: Metric<T>) => void;
}
export type MetricResult<T> = T & JsonObject;
export interface Metric<T> {
    type: string;
    schema: MakeSchemaFrom<T>;
    fetch: () => Promise<MetricResult<T> | Array<MetricResult<T>>>;
}
export declare class MonitoringCollectionPlugin implements Plugin<MonitoringCollectionSetup, void, {}, {}> {
    private readonly initializerContext;
    private readonly logger;
    private readonly config;
    private metrics;
    private prometheusExporter?;
    constructor(initializerContext: PluginInitializerContext<MonitoringCollectionConfig>);
    getMetric(type: string): Promise<any>;
    setup(core: CoreSetup): {
        registerMetric: <T>(metric: Metric<T>) => void;
    };
    start(): void;
    stop(): void;
}
