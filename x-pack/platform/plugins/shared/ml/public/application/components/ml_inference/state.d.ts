import type { DFAModelItem } from '@kbn/ml-common-types/trained_models';
import type { MlInferenceState } from './types';
export declare const getModelType: (model: DFAModelItem) => string | undefined;
export declare const getDefaultOnFailureConfiguration: () => MlInferenceState["onFailure"];
export declare const getInitialState: (model: DFAModelItem) => MlInferenceState;
