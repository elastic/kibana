import { z } from '@kbn/zod/v4';
export interface IngestStreamSettings {
    'index.number_of_replicas'?: {
        value: number;
    };
    'index.number_of_shards'?: {
        value: number;
    };
    'index.refresh_interval'?: {
        value: string | -1;
    };
}
export type WiredIngestStreamEffectiveSettings = {
    [K in keyof IngestStreamSettings]: IngestStreamSettings[K] & {
        from: string;
    };
};
export declare const ingestStreamSettingsSchema: z.Schema<IngestStreamSettings>;
export declare const wiredIngestStreamEffectiveSettingsSchema: z.Schema<WiredIngestStreamEffectiveSettings>;
