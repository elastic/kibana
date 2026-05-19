import type { Dispatch, MiddlewareAPI, Action } from '@reduxjs/toolkit';
/** cancels updates to the store that don't change the state */
export declare const optimizingMiddleware: () => (store: MiddlewareAPI) => (next: Dispatch) => (action: Action) => void;
