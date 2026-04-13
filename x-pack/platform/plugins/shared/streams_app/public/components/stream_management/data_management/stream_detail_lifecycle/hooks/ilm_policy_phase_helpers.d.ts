import type { IlmPolicy, IlmPolicyPhases } from '@kbn/streams-schema';
export interface DeleteContext {
    type: 'phase' | 'downsampleStep';
    name: string;
    stepNumber?: number;
    isManaged?: boolean;
}
type PhaseActions = Record<string, unknown>;
export interface EsIlmPhase extends Record<string, unknown> {
    min_age?: string;
    actions?: PhaseActions;
}
export interface EsIlmPolicyPhases {
    hot?: EsIlmPhase;
    warm?: EsIlmPhase;
    cold?: EsIlmPhase;
    frozen?: EsIlmPhase;
    delete?: EsIlmPhase;
}
export declare const getModifiedPhases: (policy: IlmPolicy, context: DeleteContext) => EsIlmPolicyPhases;
export declare const buildModifiedPhasesFromEdit: (policy: IlmPolicy, nextPhases: IlmPolicyPhases) => EsIlmPolicyPhases;
export {};
