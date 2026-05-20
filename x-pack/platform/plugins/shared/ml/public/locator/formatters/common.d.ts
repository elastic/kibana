import type { MlGenericUrlState } from '@kbn/ml-common-types/locator';
export declare function extractParams<UrlState>(urlState: UrlState): {
    page: any;
    params: Omit<UrlState, "page">;
};
/**
 * Creates generic index based search ML url
 * e.g. `jobs/new_job/datavisualizer?index=3da93760-e0af-11ea-9ad3-3bcfc330e42a`
 */
export declare function formatGenericMlUrl(appBasePath: string, page: MlGenericUrlState['page'] | string, pageState: MlGenericUrlState['pageState']): string;
