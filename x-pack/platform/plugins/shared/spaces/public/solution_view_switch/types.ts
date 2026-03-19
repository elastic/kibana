/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StartServicesAccessor } from '@kbn/core/public';

import type { SolutionView } from '../../common';
import type { PluginsStart } from '../plugin';
import type { SpacesManager } from '../spaces_manager';

export interface SolutionViewSwitchCalloutInternalProps {
  spacesManager: SpacesManager;
  getStartServices: StartServicesAccessor<PluginsStart>;
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
}
