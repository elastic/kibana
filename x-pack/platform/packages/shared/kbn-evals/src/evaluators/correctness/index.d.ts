import type { BoundInferenceClient } from '@kbn/inference-common';
import type { ToolingLog } from '@kbn/tooling-log';
import type { Evaluator } from '../../types';
export declare function createCorrectnessAnalysisEvaluator({ inferenceClient, log, }: {
    inferenceClient: BoundInferenceClient;
    log: ToolingLog;
}): Evaluator;
export declare function createQuantitativeCorrectnessEvaluators(): Evaluator[];
