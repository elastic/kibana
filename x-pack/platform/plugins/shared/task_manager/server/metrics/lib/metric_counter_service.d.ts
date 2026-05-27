import type { JsonObject } from '@kbn/utility-types';
export declare class MetricCounterService<T extends JsonObject> {
    private readonly counters;
    private readonly keys;
    constructor(keys: string[], initialNamespace?: string);
    initialMetrics(): T;
    reset(): void;
    increment(key: string, namespace?: string): void;
    collect(): T;
    private initializeCountersForNamespace;
    private buildCounterKey;
    private toJson;
}
