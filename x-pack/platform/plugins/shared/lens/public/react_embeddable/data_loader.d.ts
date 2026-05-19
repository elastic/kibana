import type { GetStateType, LensInternalApi, SharingSavedObjectProps } from '@kbn/lens-common';
import type { LensApi } from '@kbn/lens-common-2';
import type { LensEmbeddableStartServices } from './types';
export type ReloadReason = 'ESQLvariables' | 'attributes' | 'refId' | 'overrides' | 'disableTriggers' | 'viewMode' | 'searchContext';
/**
 * The function computes the expression used to render the panel and produces the necessary props
 * for the ExpressionWrapper component, binding any outer context to them.
 * @returns
 */
export declare function loadEmbeddableData(uuid: string, getState: GetStateType, api: LensApi, parentApi: unknown, internalApi: LensInternalApi, services: LensEmbeddableStartServices, metaInfo?: SharingSavedObjectProps): {
    cleanup: () => void;
};
