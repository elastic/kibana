import type { Client as EsClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { Evaluator } from '../../types';
export declare function createOutputTokensEvaluator({ traceEsClient, log, }: {
    traceEsClient: EsClient;
    log: ToolingLog;
}): Evaluator;
export declare function createInputTokensEvaluator({ traceEsClient, log, }: {
    traceEsClient: EsClient;
    log: ToolingLog;
}): Evaluator;
export declare function createCachedTokensEvaluator({ traceEsClient, log, }: {
    traceEsClient: EsClient;
    log: ToolingLog;
}): Evaluator;
