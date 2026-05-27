import type { PluginInitializerContext } from '@kbn/core/server';
export declare const plugin: (context: PluginInitializerContext) => Promise<import("./plugin").LicensingPlugin>;
export type { FeatureUsageServiceSetup, FeatureUsageServiceStart } from './services';
export type { ElasticsearchError, LicensingApiRequestHandlerContext, LicensingPluginSetup, LicensingPluginStart, } from './types';
export { config } from './licensing_config';
export type { CheckLicense } from './wrap_route_with_license_check';
export { wrapRouteWithLicenseCheck } from './wrap_route_with_license_check';
