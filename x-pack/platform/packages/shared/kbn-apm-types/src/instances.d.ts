import { z } from '@kbn/zod/v4';
export declare const instancesSortFieldSchema: z.ZodEnum<{
    latency: "latency";
    serviceNodeName: "serviceNodeName";
    throughput: "throughput";
    errorRate: "errorRate";
    cpuUsage: "cpuUsage";
    memoryUsage: "memoryUsage";
}>;
export type InstancesSortField = z.infer<typeof instancesSortFieldSchema>;
