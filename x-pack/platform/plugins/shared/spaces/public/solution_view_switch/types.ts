/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SolutionView } from '../../common';

export interface SolutionViewSwitchCalloutInternalProps {
  manageSpacesUrl: string;
  updateSpace: (solution: SupportedSolutionView) => Promise<void>;
  showError: (error: unknown) => void;
}

export interface SolutionViewSwitchCalloutProps {
  currentSolution: SupportedSolutionView;
}

export type SupportedSolutionView = Extract<SolutionView, 'es' | 'oblt' | 'security'>;

export interface SolutionViewSwitchModalProps {
  onClose: () => void;
  onSwitch: (solution: SupportedSolutionView) => void;
  currentSolution: SupportedSolutionView;
  isLoading: boolean;
  manageSpacesUrl: string;
}
