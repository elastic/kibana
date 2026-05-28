import type { Client as EsClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { Evaluator } from '../../types';
export declare function createToolCallsEvaluator({ traceEsClient, log, }: {
    traceEsClient: EsClient;
    log: ToolingLog;
}): Evaluator;
