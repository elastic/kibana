import React from 'react';
import type { IlmPolicyPhases, PhaseName } from '@kbn/streams-schema';
import type { FormHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { IlmPhasesFlyoutFormInternal } from '../form';
export interface RemovePhaseButtonProps {
    form: FormHook<IlmPolicyPhases, IlmPhasesFlyoutFormInternal>;
    phaseName: PhaseName | undefined;
    enabledPhases: PhaseName[];
    dataTestSubj: string;
    setSelectedPhase: (phase: PhaseName | undefined) => void;
}
export declare const RemovePhaseButton: ({ form, phaseName, enabledPhases, dataTestSubj, setSelectedPhase, }: RemovePhaseButtonProps) => React.JSX.Element | null;
