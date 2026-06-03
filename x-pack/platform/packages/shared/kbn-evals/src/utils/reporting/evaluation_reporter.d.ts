import type { SomeDevLog } from '@kbn/some-dev-log';
import type { EvaluationScoreRepository } from '../score_repository';
import type { ReportDisplayOptions } from '../../types';
export type EvaluationReporter = (scoreRepository: EvaluationScoreRepository, runId: string, log: SomeDevLog, options?: {
    taskModelId?: string;
    suiteId?: string;
}) => Promise<void>;
export declare function createDefaultTerminalReporter(options?: {
    reportDisplayOptions?: ReportDisplayOptions;
}): EvaluationReporter;
