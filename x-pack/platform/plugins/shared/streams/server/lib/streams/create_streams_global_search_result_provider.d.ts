import type { CoreSetup, Logger } from '@kbn/core/server';
import type { GlobalSearchResultProvider } from '@kbn/global-search-plugin/server';
export declare function createStreamsGlobalSearchResultProvider(core: CoreSetup, logger: Logger, getIsSecurityEnabled: () => Promise<boolean>): GlobalSearchResultProvider;
