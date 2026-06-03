import type { BoundInferenceClient } from '@kbn/inference-common';
import type { ToolingLog } from '@kbn/tooling-log';
import type { Evaluator } from '../../types';
export declare function createGroundednessAnalysisEvaluator({ inferenceClient, log, }: {
    inferenceClient: BoundInferenceClient;
    log: ToolingLog;
}): Evaluator;
export declare function createQuantitativeGroundednessEvaluator(): Evaluator;
