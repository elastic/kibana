import type * as t from 'io-ts';
export declare enum LatencyDistributionChartType {
    transactionLatency = "transactionLatency",
    spanLatency = "spanLatency",
    latencyCorrelations = "latencyCorrelations",
    failedTransactionsCorrelations = "failedTransactionsCorrelations",
    dependencyLatency = "dependencyLatency"
}
export declare const latencyDistributionChartTypeRt: t.UnionC<[t.LiteralC<LatencyDistributionChartType.transactionLatency>, t.LiteralC<LatencyDistributionChartType.spanLatency>, t.LiteralC<LatencyDistributionChartType.latencyCorrelations>, t.LiteralC<LatencyDistributionChartType.failedTransactionsCorrelations>, t.LiteralC<LatencyDistributionChartType.dependencyLatency>]>;
