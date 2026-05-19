import type { KibanaExecutionContext } from '@kbn/core/public';
import type { DefaultInspectorAdapters } from '@kbn/expressions-plugin/common';
import type { GetStateType, LensInternalApi, LensPublicCallbacks } from '@kbn/lens-common';
import type { LensApi } from '@kbn/lens-common-2';
import type { LensEmbeddableStartServices } from '../types';
export declare function prepareCallbacks(api: LensApi, internalApi: LensInternalApi, parentApi: unknown, getState: GetStateType, services: LensEmbeddableStartServices, executionContext: KibanaExecutionContext | undefined, onDataUpdate: (adapters: Partial<DefaultInspectorAdapters | undefined>) => void, dispatchRenderComplete: () => void, callbacks: LensPublicCallbacks): {
    disableTriggers: boolean | undefined;
    onRender: (count: number) => void;
    onData: (_data: unknown, adapters: Partial<DefaultInspectorAdapters> | undefined) => void;
    handleEvent: (event: import("@kbn/expressions-plugin/public").ExpressionRendererEvent) => Promise<void>;
};
