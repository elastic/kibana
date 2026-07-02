import React from 'react';
import type { EvaluationRunDatasetExample } from '@kbn/evals-common';
export interface ExampleScoresTableProps {
    examples: EvaluationRunDatasetExample[];
    selectedExampleId?: string | null;
    onExampleClick: (exampleId: string) => void;
    onTraceClick: (traceId: string, exampleId: string) => void;
}
export declare const ExampleScoresTable: React.FC<ExampleScoresTableProps>;
