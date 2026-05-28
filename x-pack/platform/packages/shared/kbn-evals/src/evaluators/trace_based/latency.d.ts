import type { Client as EsClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { Evaluator } from '../../types';
export declare function createLatencyEvaluator({ traceEsClient, log, }: {
    traceEsClient: EsClient;
    log: ToolingLog;
}): Evaluator;
export declare function createSpanLatencyEvaluator({ traceEsClient, log, spanName, }: {
    traceEsClient: EsClient;
    log: ToolingLog;
    spanName: string;
}): Evaluator;
