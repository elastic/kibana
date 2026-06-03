import type { Client as EsClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { Evaluator } from '../../types';
interface EsqlResponse {
    columns: Array<{
        name: string;
        type: string;
    }>;
    values: any[][];
}
export interface TraceBasedEvaluatorConfig {
    name: string;
    buildQuery: (traceId: string) => string;
    extractResult: (response: EsqlResponse) => number | null;
    isResultValid?: (result: number | null) => boolean;
}
export declare function createTraceBasedEvaluator({ traceEsClient, log, config, }: {
    traceEsClient: EsClient;
    log: ToolingLog;
    config: TraceBasedEvaluatorConfig;
}): Evaluator;
export {};
