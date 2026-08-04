import type { ExpressionRendererEvent } from '@kbn/expressions-plugin/public';
import type { GetStateType, LensPublicCallbacks } from '@kbn/lens-common';
import type { LensApi } from '@kbn/lens-common-2';
import type { LensEmbeddableStartServices } from '../types';
export declare const prepareEventHandler: (api: LensApi, getState: GetStateType, callbacks: LensPublicCallbacks, { data, uiActions, visualizationMap }: LensEmbeddableStartServices, disableTriggers: boolean | undefined) => (event: ExpressionRendererEvent) => Promise<void>;
