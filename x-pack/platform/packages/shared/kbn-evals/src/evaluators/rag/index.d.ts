import type { Evaluator } from '../../types';
import type { RagEvaluatorConfig } from './types';
export declare function createPrecisionAtKEvaluator<TOutput = unknown, TReferenceOutput = unknown>(config: RagEvaluatorConfig<TOutput, TReferenceOutput>): Evaluator;
export declare function createRecallAtKEvaluator<TOutput = unknown, TReferenceOutput = unknown>(config: RagEvaluatorConfig<TOutput, TReferenceOutput>): Evaluator;
export declare function createF1AtKEvaluator<TOutput = unknown, TReferenceOutput = unknown>(config: RagEvaluatorConfig<TOutput, TReferenceOutput>): Evaluator;
/**
 * Creates all RAG evaluators (Precision@K, Recall@K, F1@K) with shared configuration.
 * When k is an array or RAG_EVAL_K contains comma-separated values, evaluators are created for each K value.
 * For example, k: [5, 10] will create: Precision@5, Recall@5, F1@5, Precision@10, Recall@10, F1@10
 */
export declare function createRagEvaluators<TOutput = unknown, TReferenceOutput = unknown>(config: RagEvaluatorConfig<TOutput, TReferenceOutput>): Evaluator[];
