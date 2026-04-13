import type { IlmPolicyPhases } from '@kbn/streams-schema';
import type { IlmPhasesFlyoutFormInternal } from './types';
export declare const createIlmPhasesFlyoutDeserializer: () => (phases: IlmPolicyPhases) => IlmPhasesFlyoutFormInternal;
