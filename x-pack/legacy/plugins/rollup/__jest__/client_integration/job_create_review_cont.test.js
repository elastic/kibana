/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { setupEnvironment, pageHelpers } from './helpers';
import _ from 'lodash';
import { JOBS } from './helpers/constants';

jest.mock('ui/index_patterns', () => {
  const { INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE } = require.requireActual(
    '../../../../../../src/legacy/ui/public/index_patterns/constants'
  ); // eslint-disable-line max-len
  return { INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE };
});

jest.mock('ui/chrome', () => ({
  addBasePath: path => path,
  breadcrumbs: { set: () => {} },
  getInjected: () => ({}),
}));

jest.mock('lodash/function/debounce', () => fn => fn);

jest.mock('../../../../../../src/legacy/core_plugins/ui_metric/public', () => ({
  trackUiMetric: jest.fn(),
}));

const { setup } = pageHelpers.jobCreate;

// Temporarily created a new file for this since added this spec to `job_create_review.test.js`
// creates a routing issue. This causes a situation where we can't interact with the react component
// anymore.
describe('Create Rollup Job, step 6: Review (Cont.)', () => {
  let server;
  let httpRequestsMockHelpers;
  let find;
  let goToStep;
  let actions;

  beforeAll(() => {
    ({ server, httpRequestsMockHelpers } = setupEnvironment());
  });

  afterAll(() => {
    server.restore();
  });

  beforeEach(() => {
    // Set "default" mock responses by not providing any arguments
    httpRequestsMockHelpers.setIndexPatternValidityResponse();
    ({ find, goToStep, actions } = setup());
  });

  const jobCreateApiPath = '/api/rollup/create';
  const jobStartApiPath = '/api/rollup/start';

  describe('start()', () => {
    describe('with starting job after creation', () => {
      it('should call the "create" and "start" Api server endpoints', async () => {
        await goToStep(6);

        httpRequestsMockHelpers.setCreateJobResponse(_.first(JOBS.jobs));

        find('rollupJobToggleJobStartAfterCreation').simulate('change', {
          target: { isChecked: true },
        });

        expect(server.requests.find(r => r.url === jobCreateApiPath)).toBe(undefined); // make sure it hasn't been called
        expect(server.requests.find(r => r.url === jobStartApiPath)).toBe(undefined); // make sure it hasn't been called

        actions.clickSave();

        // Because two consecutive dispatches occur we give time for them to safely occur
        await new Promise(res => setTimeout(res, 500));

        expect(server.requests.find(r => r.url === jobCreateApiPath)).not.toBe(undefined); // It has been called!
        expect(server.requests.find(r => r.url === jobStartApiPath)).not.toBe(undefined); // It has been called!
      });
    });
  });
});
