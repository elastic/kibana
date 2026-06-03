import type { BoundInferenceClient } from '@kbn/inference-common';
import type { ToolingLog } from '@kbn/tooling-log';
import type { Evaluator } from '../../types';
type EvaluationCriterionText = string;
export interface EvaluationCriterionStructured {
    id: string;
    text: string;
    score?: number;
}
export type EvaluationCriterion = EvaluationCriterionStructured | EvaluationCriterionText;
export declare function createCriteriaEvaluator({ inferenceClient, criteria, log, }: {
    inferenceClient: BoundInferenceClient;
    criteria?: EvaluationCriterion[];
    log: ToolingLog;
}): Evaluator;
export {};
