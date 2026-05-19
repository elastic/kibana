import type { GeneralDatasourceStates } from '@kbn/lens-common';
import type { XYVisualizationState } from '../types';
export declare function convertToRuntimeState(state: XYVisualizationState, datasourceStates?: Readonly<GeneralDatasourceStates>): XYVisualizationState;
