import type { TypeOf } from '@kbn/config-schema';
export declare const apiKeyToInvalidateSchemaV1: import("@kbn/config-schema").ObjectType<{
    apiKeyId: import("@kbn/config-schema").Type<string>;
    createdAt: import("@kbn/config-schema").Type<string>;
}>;
export declare const apiKeyToInvalidateSchemaV2: import("@kbn/config-schema").ObjectType<{
    apiKeyId: import("@kbn/config-schema").Type<string>;
    createdAt: import("@kbn/config-schema").Type<string>;
    uiamApiKey: import("@kbn/config-schema").Type<string | undefined>;
}>;
export type ApiKeyToInvalidate = TypeOf<typeof apiKeyToInvalidateSchemaV2>;
