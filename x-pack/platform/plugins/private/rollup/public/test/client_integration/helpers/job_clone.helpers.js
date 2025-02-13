/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerTestBed } from '@kbn/test-jest-helpers';
import { createRollupJobsStore } from '../../../crud_app/store';
import { JobCreate } from '../../../crud_app/sections';
import { JOB_TO_CLONE } from './constants';
import { deserializeJob } from '../../../crud_app/services';

import { wrapComponent } from './setup_context';

export const setup = (props) => {
  const initTestBed = registerTestBed(wrapComponent(JobCreate), {
    store: createRollupJobsStore({
      cloneJob: { job: deserializeJob(JOB_TO_CLONE.jobs[0]) },
    }),
  });
  const testBed = initTestBed(props);
  const { component } = testBed;

  // User actions
  const clickNextStep = () => {
    const button = testBed.find('rollupJobNextButton');
    button.simulate('click');
    component.update();
  };

  return {
    ...testBed,
    actions: {
      clickNextStep,
    },
    form: {
      ...testBed.form,
      // fillFormFields,
    },
  };
};
