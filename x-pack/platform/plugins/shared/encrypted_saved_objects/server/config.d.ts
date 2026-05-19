import type { TypeOf } from '@kbn/config-schema';
export type ConfigType = TypeOf<typeof ConfigSchema>;
export declare const ConfigSchema: import("@kbn/config-schema").ObjectType<{
    encryptionKey: import("@kbn/config-schema").ConditionalType<true, string | undefined, string>;
    keyRotation: import("@kbn/config-schema").ObjectType<{
        decryptionOnlyKeys: import("@kbn/config-schema").Type<string[]>;
    }>;
}>;
