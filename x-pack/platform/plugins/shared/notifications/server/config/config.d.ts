import { type TypeOf } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core/server';
export declare const configSchema: import("@kbn/config-schema").ObjectType<{
    connectors: import("@kbn/config-schema").Type<Readonly<{
        default?: Readonly<{
            email?: string | undefined;
        } & {}> | undefined;
    } & {}> | undefined>;
}>;
export type NotificationsConfigType = TypeOf<typeof configSchema>;
export declare const config: PluginConfigDescriptor<NotificationsConfigType>;
