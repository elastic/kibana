import { type TypeOf } from '@kbn/config-schema';
export declare const configSchema: import("@kbn/config-schema").ObjectType<{
    enabled: import("@kbn/config-schema").Type<boolean>;
    workers: import("@kbn/config-schema").ObjectType<{
        anonymization: import("@kbn/config-schema").ObjectType<{
            enabled: import("@kbn/config-schema").Type<boolean>;
            minThreads: import("@kbn/config-schema").Type<number>;
            maxThreads: import("@kbn/config-schema").Type<number>;
            maxQueue: import("@kbn/config-schema").Type<number>;
            idleTimeout: import("@kbn/config-schema").Type<import("moment").Duration>;
            taskTimeout: import("@kbn/config-schema").Type<import("moment").Duration>;
        }>;
    }>;
}>;
export type InferenceConfig = TypeOf<typeof configSchema>;
export type AnonymizationWorkerConfig = InferenceConfig['workers']['anonymization'];
