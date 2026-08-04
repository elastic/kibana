import { z } from '@kbn/zod/v4';
export declare const entityTypeSchema: z.ZodEnum<{
    transaction: "transaction";
    exit_span: "exit_span";
}>;
export declare const metricSchema: z.ZodEnum<{
    latency: "latency";
    failure_rate: "failure_rate";
    throughput: "throughput";
    infra_metrics: "infra_metrics";
}>;
