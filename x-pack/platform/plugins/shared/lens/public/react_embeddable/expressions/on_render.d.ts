import type { KibanaExecutionContext } from '@kbn/core-execution-context-common';
import type { GetStateType, LensInternalApi } from '@kbn/lens-common';
import type { LensApi } from '@kbn/lens-common-2';
import type { LensEmbeddableStartServices } from '../types';
export declare function prepareOnRender(api: LensApi, internalApi: LensInternalApi, parentApi: unknown, getState: GetStateType, { datasourceMap, visualizationMap, coreStart }: LensEmbeddableStartServices, executionContext: KibanaExecutionContext | undefined, dispatchRenderComplete: () => void): (count: number) => void;
