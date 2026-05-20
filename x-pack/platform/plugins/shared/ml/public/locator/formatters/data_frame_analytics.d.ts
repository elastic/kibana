import type { DataFrameAnalyticsExplorationUrlState, DataFrameAnalyticsUrlState, MlGenericUrlState } from '@kbn/ml-common-types/locator';
export declare function formatDataFrameAnalyticsJobManagementUrl(appBasePath: string, mlUrlGeneratorState: DataFrameAnalyticsUrlState['pageState']): string;
/**
 * Creates URL to the DataFrameAnalytics Exploration page
 */
export declare function formatDataFrameAnalyticsExplorationUrl(appBasePath: string, mlUrlGeneratorState: DataFrameAnalyticsExplorationUrlState['pageState']): string;
/**
 * Creates URL to the DataFrameAnalytics creation wizard
 */
export declare function formatDataFrameAnalyticsCreateJobUrl(appBasePath: string, pageState: MlGenericUrlState['pageState']): string;
/**
 * Creates URL to the DataFrameAnalytics Map page
 */
export declare function formatDataFrameAnalyticsMapUrl(appBasePath: string, mlUrlGeneratorState: DataFrameAnalyticsExplorationUrlState['pageState']): string;
