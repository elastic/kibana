import type { BoundInferenceClient } from '@kbn/inference-common';
import type { ToolingLog } from '@kbn/tooling-log';
import type { Evaluator } from '../../types';
type EsqlPredictionExtractor<T = unknown> = (output: T) => string;
type EsqlGroundTruthExtractor<T = unknown> = (expected: T) => string;
export declare const ESQL_EQUIVALENCE_EVALUATOR_NAME = "ES|QL Functional Equivalence";
export declare function createEsqlEquivalenceEvaluator({ inferenceClient, log, predictionExtractor, groundTruthExtractor, }: {
    inferenceClient: BoundInferenceClient;
    log: ToolingLog;
    predictionExtractor: EsqlPredictionExtractor;
    groundTruthExtractor: EsqlGroundTruthExtractor;
}): Evaluator;
export {};
