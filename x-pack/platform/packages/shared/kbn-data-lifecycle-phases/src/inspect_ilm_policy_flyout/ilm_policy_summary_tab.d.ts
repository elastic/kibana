import React from 'react';
import type { Phases } from '@kbn/index-lifecycle-management-common-shared';
import type { IlmPhase } from '../phases';
interface PhaseAccordionProps {
    phase: IlmPhase;
    phases: Phases;
}
export declare const PhaseAccordion: ({ phase, phases }: PhaseAccordionProps) => React.JSX.Element;
export interface IlmPolicySummaryTabProps {
    phases: Phases;
}
export declare const IlmPolicySummaryTab: ({ phases }: IlmPolicySummaryTabProps) => React.JSX.Element;
export {};
