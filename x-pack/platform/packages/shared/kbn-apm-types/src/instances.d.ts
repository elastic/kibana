import * as t from 'io-ts';
export declare const instancesSortFieldRt: t.KeyofC<{
    serviceNodeName: null;
    latency: null;
    throughput: null;
    errorRate: null;
    cpuUsage: null;
    memoryUsage: null;
}>;
export type InstancesSortField = t.TypeOf<typeof instancesSortFieldRt>;
