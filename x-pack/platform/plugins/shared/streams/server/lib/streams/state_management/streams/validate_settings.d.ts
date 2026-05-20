import type { ElasticsearchClient } from '@kbn/core/server';
import type { IngestStreamSettings } from '@kbn/streams-schema';
import type { ValidationResult } from '../stream_active_record/stream_active_record';
export declare function validateSettings({ settings, isServerless, }: {
    settings: IngestStreamSettings;
    isServerless: boolean;
}): ValidationResult;
export declare function validateSettingsWithDryRun({ esClient, streamName, settings, isServerless, }: {
    esClient: ElasticsearchClient;
    streamName: string;
    settings: IngestStreamSettings;
    isServerless: boolean;
}): Promise<void>;
