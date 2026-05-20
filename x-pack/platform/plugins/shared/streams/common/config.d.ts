import type { TypeOf } from '@kbn/config-schema';
export declare const configSchema: import("@kbn/config-schema").ObjectType<{
    preconfigured: import("@kbn/config-schema").ObjectType<{
        enabled: import("@kbn/config-schema").Type<boolean>;
        stream_definitions: import("@kbn/config-schema").Type<any[]>;
    }>;
    workers: import("@kbn/config-schema").ObjectType<{
        patternExtraction: import("@kbn/config-schema").ObjectType<{
            enabled: import("@kbn/config-schema").Type<boolean>;
            minThreads: import("@kbn/config-schema").Type<number>;
            maxThreads: import("@kbn/config-schema").Type<number>;
            maxQueue: import("@kbn/config-schema").Type<number>;
            idleTimeout: import("@kbn/config-schema").Type<import("moment").Duration>;
            taskTimeout: import("@kbn/config-schema").Type<import("moment").Duration>;
        }>;
    }>;
}>;
export type StreamsConfig = TypeOf<typeof configSchema>;
export type PatternExtractionWorkerConfig = StreamsConfig['workers']['patternExtraction'];
/**
 * The following map is passed to the server plugin setup under the
 * exposeToBrowser: option, and controls which of the above config
 * keys are allow-listed to be available in the browser config.
 *
 * NOTE: anything exposed here will be visible in the UI dev tools,
 * and therefore MUST NOT be anything that is sensitive information!
 */
export declare const exposeToBrowserConfig: {};
export interface StreamsPublicConfig {
}
