import React from 'react';
import type { IlmPolicyPhases, PhaseName } from '@kbn/streams-schema';
import type { FormHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { IlmPhasesFlyoutFormInternal } from '../types';
export interface ReadOnlyToggleFieldProps {
    form: FormHook<IlmPolicyPhases, IlmPhasesFlyoutFormInternal>;
    phaseName: PhaseName | undefined;
    dataTestSubj: string;
    allowedPhases: ReadonlyArray<PhaseName>;
}
export declare const ReadOnlyToggleField: ({ form, phaseName, dataTestSubj, allowedPhases, }: ReadOnlyToggleFieldProps) => React.JSX.Element | null;
