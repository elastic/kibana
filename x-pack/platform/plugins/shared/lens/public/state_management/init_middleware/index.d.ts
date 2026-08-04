import type { Dispatch, MiddlewareAPI, PayloadAction } from 'redux-toolkit-v1';
import type { LensStoreDeps } from '@kbn/lens-common';
export declare const initMiddleware: (storeDeps: LensStoreDeps) => (store: MiddlewareAPI) => (next: Dispatch) => (action: PayloadAction) => Promise<void> | undefined;
