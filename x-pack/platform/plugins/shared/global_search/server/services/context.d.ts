import type { CoreStart, KibanaRequest } from '@kbn/core/server';
import type { GlobalSearchProviderContext } from '../types';
export type GlobalSearchContextFactory = (request: KibanaRequest) => GlobalSearchProviderContext;
/**
 * {@link GlobalSearchProviderContext | context} factory
 */
export declare const getContextFactory: (coreStart: CoreStart) => (request: KibanaRequest) => GlobalSearchProviderContext;
