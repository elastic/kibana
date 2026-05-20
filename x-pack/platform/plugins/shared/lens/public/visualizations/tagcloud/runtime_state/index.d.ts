import type { GeneralDatasourceStates } from '@kbn/lens-common';
import type { TagcloudState } from '../types';
export declare function convertToRuntimeState(state: TagcloudState, datasourceStates?: Readonly<GeneralDatasourceStates>): TagcloudState;
