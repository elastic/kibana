import type { AnomalyDetectionUrlState, ExplorerUrlState, MlGenericUrlState, TimeSeriesExplorerUrlState } from '@kbn/ml-common-types/locator';
/**
 * Creates URL to the Anomaly Detection Job management page
 */
export declare function formatAnomalyDetectionJobManagementUrl(appBasePath: string, params: AnomalyDetectionUrlState['pageState']): string;
export declare function formatAnomalyDetectionCreateJobSelectType(appBasePath: string, pageState: MlGenericUrlState['pageState']): string;
export declare function formatAnomalyDetectionCreateJobSelectIndex(appBasePath: string, pageState: MlGenericUrlState['pageState']): string;
export declare function formatSuppliedConfigurationsManagementUrl(appBasePath: string, pageState: MlGenericUrlState['pageState']): string;
/**
 * Creates URL to the Anomaly Explorer page
 */
export declare function formatExplorerUrl(appBasePath: string, params: ExplorerUrlState['pageState']): string;
/**
 * Creates URL to the SingleMetricViewer page
 */
export declare function formatSingleMetricViewerUrl(appBasePath: string, params: TimeSeriesExplorerUrlState['pageState']): string;
