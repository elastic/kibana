import type { ApplicationStart } from '@kbn/core/public';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';
export declare function preConfiguredJobRedirect(dataViewsService: DataViewsContract, basePath: string, navigateToUrl: ApplicationStart['navigateToUrl']): Promise<void>;
