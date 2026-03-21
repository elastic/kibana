import { type TypeOf } from '@kbn/config-schema';
export declare const configSchema: import("@kbn/config-schema").ObjectType<{
    active: import("@kbn/config-schema").Type<boolean>;
}>;
export type AnonymizationConfig = TypeOf<typeof configSchema>;
