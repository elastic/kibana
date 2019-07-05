/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';
import {
  getConfigTemplatesToInstall,
  getJobsToDisplay,
  getJobsToInstall,
  JobDetail,
  JobDetailsHeader,
  MlPopover,
  MlPopoverTitle,
} from './ml_popover';
import {
  mockConfigTemplates,
  mockEmbeddedJobIds,
  mockInstalledJobIds,
  mockJobsSummaryResponse,
} from './__mocks__/api';

jest.mock('../ml/permissions/has_ml_admin_permissions', () => ({
  hasMlAdminPermissions: () => true,
}));

describe('MlPopover', () => {
  describe('MlPopover', () => {
    test('showing a popover on a mouse click', () => {
      const wrapper = mount(<MlPopover />);
      wrapper
        .find('[data-test-subj="integrations-button"]')
        .first()
        .simulate('click');
      wrapper.update();
      expect(wrapper.find('[data-test-subj="ml-popover-contents"]').exists()).toEqual(true);
    });
  });

  describe('MlPopoverTitle', () => {
    test('renders correctly against snapshot', () => {
      const wrapper = shallow(<MlPopoverTitle />);
      expect(toJson(wrapper)).toMatchSnapshot();
    });
  });

  describe('JobDetailsHeader', () => {
    test('renders correctly against snapshot', () => {
      const wrapper = shallow(<JobDetailsHeader />);
      expect(toJson(wrapper)).toMatchSnapshot();
    });
  });

  describe('JobDetail', () => {
    const onJobStateChangeMock = jest.fn();

    test('renders correctly against snapshot', () => {
      const wrapper = shallow(
        <JobDetail
          key="job.title"
          jobName="job.title"
          jobDescription="job.description"
          isChecked={false}
          onJobStateChange={onJobStateChangeMock}
        />
      );
      expect(toJson(wrapper)).toMatchSnapshot();
    });

    test('showing a popover on a mouse click', () => {
      const wrapper = shallow(
        <JobDetail
          key="job.title"
          jobName="job.title"
          jobDescription="job.description"
          isChecked={true}
          onJobStateChange={onJobStateChangeMock}
        />
      );

      expect(
        wrapper
          .find('[data-test-subj="job-detail-switch"]')
          .first()
          .props().checked
      ).toEqual(true);
    });
  });

  describe('getJobsToInstall', () => {
    test('returns jobIds from all ConfigTemplates', () => {
      const jobsToInstall = getJobsToInstall(mockConfigTemplates);
      expect(jobsToInstall.length).toEqual(3);
    });
  });

  describe('getConfigTemplatesToInstall', () => {
    test('returns all configTemplates if no jobs are installed', () => {
      const configTemplatesToInstall = getConfigTemplatesToInstall(
        mockConfigTemplates,
        [],
        'auditbeat-*, winlogbeat-*'
      );
      expect(configTemplatesToInstall.length).toEqual(2);
    });

    test('returns subset of configTemplates if index not available', () => {
      const configTemplatesToInstall = getConfigTemplatesToInstall(
        mockConfigTemplates,
        [],
        'auditbeat-*, spongbeat-*'
      );
      expect(configTemplatesToInstall.length).toEqual(1);
    });

    test('returns all configTemplates if only partial jobs installed', () => {
      const configTemplatesToInstall = getConfigTemplatesToInstall(
        mockConfigTemplates,
        mockInstalledJobIds,
        'auditbeat-*, winlogbeat-*'
      );
      expect(configTemplatesToInstall.length).toEqual(2);
    });
  });

  describe('getJobsToDisplay', () => {
    test('returns empty array when null summaryData provided', () => {
      const jobsToDisplay = getJobsToDisplay(null, mockEmbeddedJobIds, false);
      expect(jobsToDisplay.length).toEqual(0);
    });

    test('returns DisplayJobs matching only embeddedJobs', () => {
      const jobsToDisplay = getJobsToDisplay(mockJobsSummaryResponse, mockEmbeddedJobIds, false);
      expect(jobsToDisplay.length).toEqual(3);
    });

    test('returns all DisplayJobs from jobsSummary', () => {
      const jobsToDisplay = getJobsToDisplay(mockJobsSummaryResponse, mockEmbeddedJobIds, true);
      expect(jobsToDisplay.length).toEqual(4);
    });
  });
});
