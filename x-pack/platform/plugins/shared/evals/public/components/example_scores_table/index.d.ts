import React from 'react';
import type { EvaluationExperimentDatasetExample } from '@kbn/evals-common';
export interface ExampleScoresTableProps {
    examples: EvaluationExperimentDatasetExample[];
    selectedExampleId?: string | null;
    onTraceClick: (traceId: string, exampleId: string) => void;
}
export declare const ExampleScoresTable: React.FC<ExampleScoresTableProps>;
