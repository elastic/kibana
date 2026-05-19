import type { Dispatch, MiddlewareAPI, Action } from '@reduxjs/toolkit';
import type { LensStoreDeps } from '@kbn/lens-common';
export declare const fullscreenMiddleware: (storeDeps: LensStoreDeps) => (store: MiddlewareAPI) => (next: Dispatch) => (action: Action) => void;
