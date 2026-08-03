import React from 'react';
import type { EvaluationDefinition, StatDefinition } from './form_types';
export interface EvaluationExpressionFieldProps {
    readonly index: number;
    readonly currentEvaluation: EvaluationDefinition;
    readonly onChange: (value: string) => void;
    readonly stats: StatDefinition[];
    readonly evaluations: EvaluationDefinition[];
    readonly evaluationInvalidRefs: Map<string, string[]>;
}
export declare const EvaluationExpressionField: React.FC<EvaluationExpressionFieldProps>;
