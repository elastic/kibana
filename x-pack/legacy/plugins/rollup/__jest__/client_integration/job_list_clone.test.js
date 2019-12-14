/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { setupEnvironment, pageHelpers, nextTick } from './helpers';
import { JOB_TO_CLONE, JOB_CLONE_INDEX_PATTERN_CHECK } from './helpers/constants';
import { getRouter } from '../../public/crud_app/services/routing';
import { CRUD_APP_BASE_PATH } from '../../public/crud_app/constants';

jest.mock('ui/new_platform');

jest.mock('lodash/function/debounce', () => fn => fn);

const { setup } = pageHelpers.jobList;

describe('Smoke test cloning an existing rollup job from job list', () => {
  let server;
  let httpRequestsMockHelpers;
  let table;
  let find;
  let component;
  let exists;

  beforeAll(() => {
    ({ server, httpRequestsMockHelpers } = setupEnvironment());
  });

  afterAll(() => {
    server.restore();
  });

  beforeEach(async () => {
    httpRequestsMockHelpers.setIndexPatternValidityResponse(JOB_CLONE_INDEX_PATTERN_CHECK);
    httpRequestsMockHelpers.setLoadJobsResponse(JOB_TO_CLONE);

    ({ find, exists, table, component } = setup());

    await nextTick(); // We need to wait next tick for the mock server response to comes in
    component.update();
  });

  it('should navigate to create view with default values set', async () => {
    const router = getRouter();
    const { rows } = table.getMetaData('rollupJobsListTable');
    const button = rows[0].columns[1].reactWrapper.find('button');

    expect(exists('rollupJobDetailFlyout')).toBe(false); // make sure it is not shown

    button.simulate('click');

    expect(exists('rollupJobDetailFlyout')).toBe(true);
    expect(exists('jobActionMenuButton')).toBe(true);

    find('jobActionMenuButton').simulate('click');

    expect(router.history.location.pathname).not.toBe(`${CRUD_APP_BASE_PATH}/create`);
    find('jobCloneActionContextMenu').simulate('click');
    expect(router.history.location.pathname).toBe(`${CRUD_APP_BASE_PATH}/create`);
  });
});
