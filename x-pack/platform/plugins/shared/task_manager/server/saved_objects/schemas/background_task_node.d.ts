import type { TypeOf } from '@kbn/config-schema';
export declare const backgroundTaskNodeSchemaV1: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string>;
    last_seen: import("@kbn/config-schema").Type<string>;
}>;
export type BackgroundTaskNode = TypeOf<typeof backgroundTaskNodeSchemaV1>;
