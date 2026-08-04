import type { KibanaExecutionContext } from '@kbn/core/public';
import type { GetStateType, LensInternalApi, LensPublicCallbacks } from '@kbn/lens-common';
import type { LensApi } from '@kbn/lens-common-2';
import type { LensEmbeddableStartServices } from '../types';
import type { OnDataCallback } from '../type_guards';
export declare function prepareCallbacks(api: LensApi, internalApi: LensInternalApi, parentApi: unknown, getState: GetStateType, services: LensEmbeddableStartServices, executionContext: KibanaExecutionContext | undefined, onDataUpdate: OnDataCallback, dispatchRenderComplete: () => void, callbacks: LensPublicCallbacks): {
    disableTriggers: boolean | undefined;
    onRender: (count: number) => void;
    onData: (data: unknown, adapters?: unknown, partial?: boolean | undefined) => void;
    handleEvent: (event: import("@kbn/expressions-plugin/public").ExpressionRendererEvent) => Promise<void>;
};
