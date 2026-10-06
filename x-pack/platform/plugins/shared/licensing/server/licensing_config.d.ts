import type { TypeOf } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core/server';
declare const configSchema: import("@kbn/config-schema").ObjectType<{
    api_polling_frequency: import("@kbn/config-schema").Type<import("moment").Duration>;
    license_cache_duration: import("@kbn/config-schema").Type<import("moment").Duration>;
}>;
export type LicenseConfigType = TypeOf<typeof configSchema>;
export declare const config: PluginConfigDescriptor<LicenseConfigType>;
export {};
