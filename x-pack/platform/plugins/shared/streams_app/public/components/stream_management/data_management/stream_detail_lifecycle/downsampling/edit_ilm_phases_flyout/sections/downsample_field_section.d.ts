import React from 'react';
import type { IlmPolicyPhases } from '@kbn/streams-schema';
import type { FormHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { DownsamplePhase, IlmPhasesFlyoutFormInternal } from '../form';
export interface DownsampleFieldSectionProps {
    form: FormHook<IlmPolicyPhases, IlmPhasesFlyoutFormInternal>;
    phaseName: DownsamplePhase;
    dataTestSubj: string;
    isMetricsStream: boolean;
}
export declare const DownsampleFieldSection: ({ form, phaseName, dataTestSubj, isMetricsStream, }: DownsampleFieldSectionProps) => React.JSX.Element | null;
