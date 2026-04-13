import React from 'react';
import type { IlmPolicyPhases, PhaseName } from '@kbn/streams-schema';
import type { FormHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { IlmPhasesFlyoutFormInternal } from '../types';
export interface DeleteSearchableSnapshotToggleFieldProps {
    form: FormHook<IlmPolicyPhases, IlmPhasesFlyoutFormInternal>;
    phaseName: PhaseName | undefined;
    dataTestSubj: string;
}
export declare const DeleteSearchableSnapshotToggleField: ({ form, phaseName, dataTestSubj, }: DeleteSearchableSnapshotToggleFieldProps) => React.JSX.Element | null;
