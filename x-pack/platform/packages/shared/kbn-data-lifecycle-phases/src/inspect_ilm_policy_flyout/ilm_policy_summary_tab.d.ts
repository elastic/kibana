/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
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
export declare const IlmPolicySummaryTab: ({
  phases,
}: IlmPolicySummaryTabProps) => React.JSX.Element;
export {};
