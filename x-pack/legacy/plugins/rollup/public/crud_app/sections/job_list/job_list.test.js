/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerTestBed } from '../../../../../../../test_utils';
import { rollupJobsStore } from '../../store';
import { JobList } from './job_list';

jest.mock('ui/new_platform');

jest.mock('ui/chrome', () => ({
  addBasePath: () => {},
  breadcrumbs: { set: () => {} },
  getInjected: (key) => {
    if (key === 'uiCapabilities') {
      return {
        navLinks: {},
        management: {},
        catalogue: {}
      };
    }
  }
}));

jest.mock('../../services', () => {
  const services = require.requireActual('../../services');
  return {
    ...services,
    getRouterLinkProps: (link) => ({ href: link }),
  };
});

const defaultProps = {
  history: { location: {} },
  loadJobs: () => {},
  refreshJobs: () => {},
  openDetailPanel: () => {},
  hasJobs: false,
  isLoading: false
};

const initTestBed = registerTestBed(JobList, { defaultProps, store: rollupJobsStore });

describe('<JobList />', () => {
  it('should render empty prompt when loading is complete and there are no jobs', () => {
    const { exists } = initTestBed();

    expect(exists('jobListEmptyPrompt')).toBeTruthy();
  });

  it('should display a loading message when loading the jobs', () => {
    const { component, exists } = initTestBed({ isLoading: true });

    expect(exists('jobListLoading')).toBeTruthy();
    expect(component.find('JobTableUi').length).toBeFalsy();
  });

  it('should display the <JobTable /> when there are jobs', () => {
    const { component, exists } = initTestBed({ hasJobs: true });

    expect(exists('jobListLoading')).toBeFalsy();
    expect(component.find('JobTableUi').length).toBeTruthy();
  });

  describe('when there is an API error', () => {
    const { exists, find } = initTestBed({
      jobLoadError: {
        status: 400,
        data: { statusCode: 400, error: 'Houston we got a problem.' }
      }
    });

    it('should display a callout with the status and the message', () => {
      expect(exists('jobListError')).toBeTruthy();
      expect(find('jobListError').find('EuiText').text()).toEqual('400 Houston we got a problem.');
    });
  });

  describe('when the user does not have the permission to access it', () =>  {
    const { exists } = initTestBed({ jobLoadError: { status: 403 } });

    it('should render a callout message', () => {
      expect(exists('jobListNoPermission')).toBeTruthy();
    });

    it('should display the page header', () => {
      expect(exists('jobListPageHeader')).toBeTruthy();
    });
  });
});
