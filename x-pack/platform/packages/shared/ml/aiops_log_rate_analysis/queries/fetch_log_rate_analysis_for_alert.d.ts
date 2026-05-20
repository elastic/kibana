import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
/**
 * Runs log rate analysis data on an index given some alert metadata.
 */
export declare function fetchLogRateAnalysisForAlert({ esClient, abortSignal, arguments: args, }: {
    esClient: ElasticsearchClient;
    abortSignal?: AbortSignal;
    arguments: {
        index: string;
        alertStartedAt: string;
        alertRuleParameterTimeSize?: number;
        alertRuleParameterTimeUnit?: string;
        timefield?: string;
        searchQuery?: estypes.QueryDslQueryContainer;
    };
}): Promise<{
    logRateAnalysisType: import("../log_rate_analysis_type").LogRateAnalysisType;
    significantItems: {
        score: number;
        fieldType: string;
        fieldName: string;
        fieldValue: string;
        message: string;
        change: {
            baseline: number;
            deviation: number;
        };
    }[];
}>;
export declare function runLogRateAnalysis({ esClient, abortSignal, arguments: args, }: {
    esClient: ElasticsearchClient;
    abortSignal?: AbortSignal;
    arguments: {
        index: string;
        windowParameters: {
            baselineMin: number;
            baselineMax: number;
            deviationMin: number;
            deviationMax: number;
        };
        timefield?: string;
        searchQuery?: estypes.QueryDslQueryContainer;
    };
}): Promise<{
    logRateAnalysisType: import("../log_rate_analysis_type").LogRateAnalysisType;
    significantItems: {
        score: number;
        fieldType: string;
        fieldName: string;
        fieldValue: string;
        message: string;
        change: {
            baseline: number;
            deviation: number;
        };
    }[];
}>;
