import type { DependencyList } from 'react';
import type { MlLocatorParams } from '@kbn/ml-common-types/locator';
import type { MlPluginSetup } from '..';
/**
 * Provides a URL to ML plugin page
 * TODO remove basePath parameter
 */
export declare const useMlHref: (ml: MlPluginSetup | undefined, basePath: string | undefined, params: MlLocatorParams, dependencies?: DependencyList) => string;
