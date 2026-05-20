import type { NavigateToPath } from '../../../contexts/kibana';
import type { MlRoute } from '../../router';
export declare const indexBasedRouteFactory: (navigateToPath: NavigateToPath, basePath: string) => MlRoute;
export declare const indexESQLBasedRouteFactory: (navigateToPath: NavigateToPath, basePath: string) => MlRoute;
