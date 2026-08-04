import type { Dispatch, MiddlewareAPI, Action } from 'redux-toolkit-v1';
/** cancels updates to the store that don't change the state */
export declare const optimizingMiddleware: () => (store: MiddlewareAPI) => (next: Dispatch) => (action: Action) => void;
