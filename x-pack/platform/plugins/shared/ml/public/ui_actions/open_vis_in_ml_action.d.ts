import { type EmbeddableApiContext } from '@kbn/presentation-publishing';
import type { UiActionsActionDefinition } from '@kbn/ui-actions-plugin/public';
import type { ActionApi } from './types';
import type { MlCoreSetup } from '../plugin';
export declare const CREATE_LENS_VIS_TO_ML_AD_JOB_ACTION = "createMLADJobAction";
export declare const isApiCompatible: (api: unknown | null) => api is ActionApi;
export declare function createVisToADJobAction(getStartServices: MlCoreSetup['getStartServices']): UiActionsActionDefinition<EmbeddableApiContext>;
