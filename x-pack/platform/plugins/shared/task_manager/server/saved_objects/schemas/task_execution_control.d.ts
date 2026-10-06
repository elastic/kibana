import type { TypeOf } from '@kbn/config-schema';
export declare const taskExecutionControlSchemaV1: import("@kbn/config-schema").ObjectType<{
    paused: import("@kbn/config-schema").Type<boolean>;
    paused_task_types: import("@kbn/config-schema").Type<string[]>;
    updated_at: import("@kbn/config-schema").Type<string>;
    updated_by: import("@kbn/config-schema").Type<string | undefined>;
}>;
export type TaskExecutionControl = TypeOf<typeof taskExecutionControlSchemaV1>;
