import type { TypeOf } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core/server';
export type * from './types';
declare const configSchema: import("@kbn/config-schema").ObjectType<{
    enabled: import("@kbn/config-schema").Type<boolean>;
    developer: import("@kbn/config-schema").Type<Readonly<{
        projectSwitcher?: Readonly<{} & {
            enabled: boolean;
            currentType: "security" | "workplaceai" | "vectordb" | "search" | "observability";
        }> | undefined;
    } & {}> | undefined>;
}>;
type ConfigType = TypeOf<typeof configSchema>;
export declare const config: PluginConfigDescriptor<ConfigType>;
export type ServerlessConfig = TypeOf<typeof configSchema>;
