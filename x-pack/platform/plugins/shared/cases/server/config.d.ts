import type { TypeOf } from '@kbn/config-schema';
export declare const ConfigSchema: import("@kbn/config-schema").ObjectType<{
    analytics: import("@kbn/config-schema").ObjectType<{
        index: import("@kbn/config-schema").ObjectType<{
            enabled: import("@kbn/config-schema").ConditionalType<true, boolean, boolean>;
        }>;
    }>;
    attachments: import("@kbn/config-schema").ObjectType<{
        enabled: import("@kbn/config-schema").Type<boolean>;
    }>;
    markdownPlugins: import("@kbn/config-schema").ObjectType<{
        lens: import("@kbn/config-schema").Type<boolean>;
    }>;
    files: import("@kbn/config-schema").ObjectType<{
        allowedMimeTypes: import("@kbn/config-schema").Type<string[]>;
        maxSize: import("@kbn/config-schema").Type<number | undefined>;
    }>;
    incrementalId: import("@kbn/config-schema").ObjectType<{
        /**
         * Whether the incremental id service should be enabled
         */
        enabled: import("@kbn/config-schema").Type<boolean>;
        /**
         * The interval that the task should be scheduled at
         */
        taskIntervalMinutes: import("@kbn/config-schema").Type<number>;
        /**
         * The initial delay the task will be started with
         */
        taskStartDelayMinutes: import("@kbn/config-schema").Type<number>;
    }>;
    stack: import("@kbn/config-schema").ObjectType<{
        enabled: import("@kbn/config-schema").Type<boolean>;
    }>;
    templates: import("@kbn/config-schema").ObjectType<{
        enabled: import("@kbn/config-schema").Type<boolean>;
    }>;
    enabled: import("@kbn/config-schema").Type<boolean>;
}>;
export type ConfigType = TypeOf<typeof ConfigSchema>;
