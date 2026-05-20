import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ChangePointType } from '@kbn/es-types/src';
import type { TracedElasticsearchClient } from '@kbn/traced-es-client';
import type { Logger } from '@kbn/logging';
interface FieldPatternResultBase {
    field: string;
    count: number;
    pattern: string;
    regex: string;
    sample: string;
    firstOccurrence: string;
    lastOccurrence: string;
    highlight: Record<string, string[]>;
    metadata: Record<string, unknown[] | undefined>;
}
interface FieldPatternResultChanges {
    timeseries: Array<{
        x: number;
        y: number;
    }>;
    change: {
        timestamp?: string;
        significance: 'high' | 'medium' | 'low' | null;
        type: ChangePointType;
        change_point?: number;
        p_value?: number;
    };
}
export type FieldPatternResult<TChanges extends boolean | undefined = undefined> = FieldPatternResultBase & (TChanges extends true ? FieldPatternResultChanges : {});
export type FieldPatternResultWithChanges = FieldPatternResult<true>;
export interface LogPatternEsqlEntry {
    field: string;
    pattern: string;
    count: number;
    sample: string;
}
interface CategorizeTextOptions {
    query: QueryDslQueryContainer;
    metadata: string[];
    esClient: TracedElasticsearchClient;
    samplingProbability: number;
    fields: string[];
    index: string | string[];
    useMlStandardTokenizer: boolean;
    size: number;
    start: number;
    end: number;
}
export declare function runCategorizeTextAggregation<TChanges extends boolean | undefined = undefined>(options: CategorizeTextOptions & {
    includeChanges?: TChanges;
}): Promise<Array<FieldPatternResult<TChanges>>>;
interface LogPatternOptions {
    esClient: TracedElasticsearchClient;
    start: number;
    end: number;
    index: string | string[];
    fields: string[];
    metadata?: string[];
    kql?: string;
}
interface SigEventsLogPatternEsqlOptions {
    esClient: TracedElasticsearchClient;
    start: number;
    end: number;
    index: string | string[];
    fields: string[];
    kql?: string;
    logger: Logger;
}
export declare function getLogPatterns<TChanges extends boolean | undefined = undefined>(options: LogPatternOptions & {
    includeChanges?: TChanges;
}): Promise<Array<FieldPatternResult<TChanges>>>;
export declare function getSigEventsLogPatternsEsql({ esClient, start, end, index, kql, fields, logger, }: SigEventsLogPatternEsqlOptions): Promise<LogPatternEsqlEntry[]>;
export {};
