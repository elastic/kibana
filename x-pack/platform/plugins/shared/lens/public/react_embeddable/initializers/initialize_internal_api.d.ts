import type { initializeTitleManager } from '@kbn/presentation-publishing';
import type { LensInternalApi, LensRuntimeState } from '@kbn/lens-common';
import type { LensEmbeddableStartServices } from '../types';
export declare function initializeInternalApi(initialState: LensRuntimeState, parentApi: unknown, titleManager: ReturnType<typeof initializeTitleManager>, { visualizationMap }: LensEmbeddableStartServices): LensInternalApi;
