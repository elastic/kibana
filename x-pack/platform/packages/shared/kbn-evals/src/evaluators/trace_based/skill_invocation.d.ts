import type { Client as EsClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { Evaluator } from '../../types';
export declare function createSkillInvocationEvaluator({ traceEsClient, log, skillName, }: {
    traceEsClient: EsClient;
    log: ToolingLog;
    skillName: string;
}): Evaluator;
