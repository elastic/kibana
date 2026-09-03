/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PageObjects, ScoutPage } from '@kbn/scout';
import { createLazyPageObject } from '@kbn/scout';
import { MlDataVisualizerActions } from './ml_data_visualizer_actions';
import { MlJobWizard } from './ml_job_wizard';

export interface MlUiPageObjects extends PageObjects {
  mlDataVisualizerActions: MlDataVisualizerActions;
  mlJobWizard: MlJobWizard;
}

export function extendPageObjects(pageObjects: PageObjects, page: ScoutPage): MlUiPageObjects {
  return {
    ...pageObjects,
    mlDataVisualizerActions: createLazyPageObject(MlDataVisualizerActions, page),
    mlJobWizard: createLazyPageObject(MlJobWizard, page),
  };
}

export { MlDataVisualizerActions } from './ml_data_visualizer_actions';
export { MlJobWizard } from './ml_job_wizard';
