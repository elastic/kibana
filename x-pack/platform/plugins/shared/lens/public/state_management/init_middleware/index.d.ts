import type { Dispatch, MiddlewareAPI, PayloadAction } from '@reduxjs/toolkit';
import type { LensStoreDeps } from '@kbn/lens-common';
export declare const initMiddleware: (storeDeps: LensStoreDeps) => (store: MiddlewareAPI) => (next: Dispatch) => (action: PayloadAction) => Promise<void> | undefined;
