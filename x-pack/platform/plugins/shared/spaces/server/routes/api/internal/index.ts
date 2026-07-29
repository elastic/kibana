/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { initCompleteInitialSolutionSetupApi } from './complete_initial_solution_setup';
import { initGetActiveSpaceApi } from './get_active_space';
import { initGetSpaceContentSummaryApi } from './get_content_summary';
import { initGetInitialSolutionSetupApi } from './get_initial_solution_setup';
import { initGetPersistedFeatureVisibilityApi } from './get_persisted_feature_visibility';
import { initSetSolutionSpaceApi } from './set_solution_space';
import type { InitialSolutionSetupService } from '../../../initial_solution_setup/initial_solution_setup_service';
import type { SpacesServiceStart } from '../../../spaces_service/spaces_service';
import type { SpacesRouter } from '../../../types';

export interface InternalRouteDeps {
  router: SpacesRouter;
  getSpacesService: () => SpacesServiceStart;
}

export interface InitialSolutionSetupRouteDeps {
  router: SpacesRouter;
  initialSolutionSetup: InitialSolutionSetupService;
}

export function initInternalSpacesApi(deps: InternalRouteDeps & InitialSolutionSetupRouteDeps) {
  initCompleteInitialSolutionSetupApi(deps);
  initGetActiveSpaceApi(deps);
  initGetSpaceContentSummaryApi(deps);
  initGetInitialSolutionSetupApi(deps);
  initSetSolutionSpaceApi(deps);
  initGetPersistedFeatureVisibilityApi(deps);
}
