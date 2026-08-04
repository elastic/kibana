import { z } from '@kbn/zod/v4';
export declare enum LatencyDistributionChartType {
    transactionLatency = "transactionLatency",
    spanLatency = "spanLatency",
    latencyCorrelations = "latencyCorrelations",
    failedTransactionsCorrelations = "failedTransactionsCorrelations",
    dependencyLatency = "dependencyLatency"
}
export declare const latencyDistributionChartTypeSchema: z.ZodUnion<readonly [z.ZodLiteral<LatencyDistributionChartType.transactionLatency>, z.ZodLiteral<LatencyDistributionChartType.spanLatency>, z.ZodLiteral<LatencyDistributionChartType.latencyCorrelations>, z.ZodLiteral<LatencyDistributionChartType.failedTransactionsCorrelations>, z.ZodLiteral<LatencyDistributionChartType.dependencyLatency>]>;
