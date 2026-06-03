import type { EvaluationScoreDocument } from '../utils/score_repository';
export type EvalDocVersion = 'v1';
export declare const CURRENT_EVAL_DOC_VERSION: EvalDocVersion;
export declare function getEvalDoc(version?: EvalDocVersion): EvaluationScoreDocument;
