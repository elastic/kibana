import type { NavigateToPath } from '../../../contexts/kibana';
import type { MlRoute } from '../../router';
export declare const logRateAnalysisIndexOrSearchRouteFactory: (navigateToPath: NavigateToPath, basePath: string) => MlRoute;
/**
 * @deprecated since 8.10, kept here to redirect old bookmarks.
 */
export declare const explainLogRateSpikesIndexOrSearchRouteFactory: () => MlRoute;
export declare const logCategorizationIndexOrSearchRouteFactory: (navigateToPath: NavigateToPath, basePath: string) => MlRoute;
export declare const changePointDetectionIndexOrSearchRouteFactory: (navigateToPath: NavigateToPath, basePath: string) => MlRoute;
