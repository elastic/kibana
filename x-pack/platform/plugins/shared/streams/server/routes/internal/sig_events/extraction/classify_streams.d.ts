import { Streams } from '@kbn/streams-schema';
import type { PersistedTask } from '../../../../lib/tasks/types';
import type { FeaturesIdentificationTaskParams } from '../../../../lib/tasks/task_definitions/features_identification';
export interface StreamCandidate {
    streamName: string;
    lastCompletedAt: string | null;
}
export interface StreamClassificationResult {
    alreadyRunning: Array<{
        streamName: string;
        scheduledAt: string | null;
    }>;
    candidates: StreamCandidate[];
    upToDate: StreamCandidate[];
    excluded: string[];
    unsupported: string[];
    excludePatterns: string[];
}
export declare const parseExcludePatterns: (raw: string | undefined) => string[];
/**
 * Classifies streams into buckets (excluded, already-running, candidates, up-to-date)
 * by walking the ES-sorted task list and comparing each stream's last activity
 * against the configured extraction interval.
 */
export declare const classifyStreams: ({ allStreams, sortedTasks, excludedStreamPatterns, intervalHours, }: {
    allStreams: Streams.all.Definition[];
    sortedTasks: Array<PersistedTask<FeaturesIdentificationTaskParams>>;
    excludedStreamPatterns: string;
    intervalHours: number;
}) => StreamClassificationResult;
