import { type TypeOf } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core/server';
declare const configSchema: import("@kbn/config-schema").ObjectType<{
    artifactRepositoryUrl: import("@kbn/config-schema").Type<string>;
    artifactRepositoryProxyUrl: import("@kbn/config-schema").Type<string | undefined>;
    elserInferenceId: import("@kbn/config-schema").Type<string>;
}>;
export declare const config: PluginConfigDescriptor<ProductDocBaseConfig>;
export type ProductDocBaseConfig = TypeOf<typeof configSchema>;
export {};
