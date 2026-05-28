import type { Evaluator, Example, TaskOutput } from '../types';
export declare function parseSelectedEvaluators(): string[];
export declare function selectEvaluators<TExample extends Example, TTaskOutput extends TaskOutput>(evaluators: Evaluator<TExample, TTaskOutput>[]): Evaluator<TExample, TTaskOutput>[];
