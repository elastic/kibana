/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getRouter } from '../../public/crud_app/services';
import { setupEnvironment, pageHelpers, nextTick } from './helpers';
import { JOBS } from './helpers/constants';

jest.mock('ui/new_platform');

jest.mock('../../public/crud_app/services', () => {
  const services = require.requireActual('../../public/crud_app/services');
  return {
    ...services,
    getRouterLinkProps: (link) => ({ href: link }),
  };
});

const { setup } = pageHelpers.jobList;

describe('<JobList />', () => {
  describe('detail panel', () => {
    let server;
    let httpRequestsMockHelpers;
    let component;
    let table;
    let exists;

    beforeAll(() => {
      ({ server, httpRequestsMockHelpers } = setupEnvironment());
    });

    afterAll(() => {
      server.restore();
    });

    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadJobsResponse(JOBS);

      ({ component, exists, table } = setup());

      await nextTick(); // We need to wait next tick for the mock server response to comes in
      component.update();
    });

    test('should open the detail panel when clicking on a job in the table', () => {
      const { rows } = table.getMetaData('rollupJobsListTable');
      const button = rows[0].columns[1].reactWrapper.find('button');

      expect(exists('rollupJobDetailFlyout')).toBe(false); // make sure it is not shown

      button.simulate('click');

      expect(exists('rollupJobDetailFlyout')).toBe(true);
    });

    test('should add the Job id to the route query params when opening the detail panel', () => {
      const { rows } = table.getMetaData('rollupJobsListTable');
      const button = rows[0].columns[1].reactWrapper.find('button');

      expect(getRouter().history.location.search).toEqual('');

      button.simulate('click');

      const {
        jobs: [{
          config: { id: jobId },
        }],
      } = JOBS;
      expect(getRouter().history.location.search).toEqual(`?job=${jobId}`);
    });

    test('should open the detail panel whenever a job id is added to the query params', () => {
      expect(exists('rollupJobDetailFlyout')).toBe(false); // make sure it is not shown

      getRouter().history.replace({ search: `?job=bar` });

      component.update();

      expect(exists('rollupJobDetailFlyout')).toBe(true);
    });
  });
});
