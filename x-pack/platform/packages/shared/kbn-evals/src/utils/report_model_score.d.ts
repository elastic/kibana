import type { SomeDevLog } from '@kbn/some-dev-log';
import type { Model } from '@kbn/inference-common';
import type { EvaluationScoreRepository } from './score_repository';
import { type EvaluationScoreDocument } from './score_repository';
import { type GitMetadata } from './git_metadata';
import type { RanExperiment, EvaluationCompleteEvent } from '../types';
export interface BuildSingleScoreDocumentParams {
    event: EvaluationCompleteEvent;
    taskModel: Model;
    evaluatorModel: Model;
    runId: string;
    totalRepetitions: number;
    timestamp: string;
    gitMetadata: GitMetadata;
    hostName: string;
}
/**
 * Builds a single `EvaluationScoreDocument` from an incremental evaluation event.
 * Used by the Playwright fixture callback to export each evaluator result as it completes.
 * The same document structure is produced by `mapToEvaluationScoreDocuments` for the batch path.
 */
export declare function buildSingleScoreDocument({ event, taskModel, evaluatorModel, runId, totalRepetitions, timestamp, gitMetadata: git, hostName, }: BuildSingleScoreDocumentParams): EvaluationScoreDocument;
export declare function mapToEvaluationScoreDocuments({ experiments, taskModel, evaluatorModel, runId, totalRepetitions, }: {
    experiments: RanExperiment[];
    taskModel: Model;
    evaluatorModel: Model;
    runId: string;
    totalRepetitions: number;
}): Promise<EvaluationScoreDocument[]>;
export declare function exportEvaluations(documents: EvaluationScoreDocument[], scoreRepository: EvaluationScoreRepository, log: SomeDevLog): Promise<void>;
