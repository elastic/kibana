import type { PluginConfigDescriptor } from '@kbn/core/server';
import type { ReportingConfigType } from '@kbn/reporting-server';
import { ConfigSchema } from '@kbn/reporting-server';
export declare const config: PluginConfigDescriptor<ReportingConfigType>;
export { createConfig } from './create_config';
export { registerUiSettings } from './ui_settings';
export { ConfigSchema };
