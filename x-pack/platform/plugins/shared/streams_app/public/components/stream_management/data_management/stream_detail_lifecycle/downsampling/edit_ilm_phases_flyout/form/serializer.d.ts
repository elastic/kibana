import type { IlmPolicyPhases } from '@kbn/streams-schema';
import type { IlmPhasesFlyoutFormInternal } from './types';
export declare const createIlmPhasesFlyoutSerializer: (initialPhases?: IlmPolicyPhases) => (data: IlmPhasesFlyoutFormInternal) => IlmPolicyPhases;
