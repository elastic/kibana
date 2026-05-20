import type { AnyIntraAppRouteState } from '../types';
/**
 * Retrieve UI Route state from the React Router History for the current URL location.
 * This state can be used by other Kibana Apps to influence certain behaviours in Ingest, for example,
 * redirecting back to an given Application after a craete action.
 */
export declare function useIntraAppState<S = AnyIntraAppRouteState>(): S | undefined;
