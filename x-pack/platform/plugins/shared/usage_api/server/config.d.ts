import type { TypeOf } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core/server';
declare const configSchema: import("@kbn/config-schema").ObjectType<{
    enabled: import("@kbn/config-schema").Type<boolean>;
    url: import("@kbn/config-schema").Type<string | undefined>;
    tls: import("@kbn/config-schema").Type<Readonly<{} & {
        certificate: string;
        key: string;
        ca: string;
    }> | undefined>;
}>;
export type UsageApiConfigType = TypeOf<typeof configSchema>;
export declare const config: PluginConfigDescriptor<UsageApiConfigType>;
export {};
