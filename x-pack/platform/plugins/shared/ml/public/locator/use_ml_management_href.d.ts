import type { MlLocatorParams } from '@kbn/ml-common-types/locator';
import type { MlPluginSetup } from '..';
/**
 * Provides a URL to ML management pages
 */
export declare const useMlManagementHref: (ml: MlPluginSetup | undefined, params: MlLocatorParams, appId?: string) => string | undefined;
