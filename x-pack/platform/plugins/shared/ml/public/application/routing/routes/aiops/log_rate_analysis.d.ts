import type { NavigateToPath } from '../../../contexts/kibana';
import type { MlRoute } from '../../router';
export declare const logRateAnalysisRouteFactory: (navigateToPath: NavigateToPath, basePath: string) => MlRoute;
/**
 * @deprecated since 8.10, kept here to redirect old bookmarks.
 */
export declare const explainLogRateSpikesRouteFactory: () => MlRoute;
