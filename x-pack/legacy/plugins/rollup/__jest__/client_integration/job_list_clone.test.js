/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { setupEnvironment, pageHelpers, nextTick } from './helpers';
import { JOB_TO_CLONE, JOB_CLONE_INDEX_PATTERN_CHECK } from './helpers/constants';

jest.mock('ui/index_patterns', () => {
  const { INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE } = require.requireActual(
    '../../../../../../src/legacy/ui/public/index_patterns/constants'
  ); // eslint-disable-line max-len
  return { INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE };
});

jest.mock('ui/chrome', () => ({
  addBasePath: () => '/api/rollup',
  breadcrumbs: { set: () => {} },
  getInjected: () => ({}),
}));

jest.mock('lodash/function/debounce', () => fn => fn);

const { setup } = pageHelpers.jobList;

describe('Cloning an existing rollup job from job list', () => {
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
    const { rows } = table.getMetaData('rollupJobsListTable');
    const button = rows[0].columns[1].reactWrapper.find('button');

    expect(exists('rollupJobDetailFlyout')).toBe(false); // make sure it is not shown

    button.simulate('click');

    expect(exists('rollupJobDetailFlyout')).toBe(true);
    expect(exists('jobActionMenuButton')).toBe(true);

    find('jobActionMenuButton').simulate('click');
    find('jobActionMenuButton').simulate('click');
    find('jobCloneActionContextMenu').simulate('click');
  });
});
