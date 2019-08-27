/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  mockConfigTemplates,
  mockEmbeddedJobIds,
  mockInstalledJobIds,
  mockJobsSummaryResponse,
} from './__mocks__/api';
import {
  getConfigTemplatesToInstall,
  getJobsToDisplay,
  getJobsToInstall,
  searchFilter,
} from './helpers';

jest.mock('../ml/permissions/has_ml_admin_permissions', () => ({
  hasMlAdminPermissions: () => true,
}));

describe('helpers', () => {
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
        ['auditbeat-*', 'winlogbeat-*']
      );
      expect(configTemplatesToInstall.length).toEqual(2);
    });

    test('returns subset of configTemplates if index not available', () => {
      const configTemplatesToInstall = getConfigTemplatesToInstall(
        mockConfigTemplates,
        [],
        ['auditbeat-*', 'spongbeat-*']
      );
      expect(configTemplatesToInstall.length).toEqual(1);
    });

    test('returns all configTemplates if only partial jobs installed', () => {
      const configTemplatesToInstall = getConfigTemplatesToInstall(
        mockConfigTemplates,
        mockInstalledJobIds,
        ['auditbeat-*', 'winlogbeat-*']
      );
      expect(configTemplatesToInstall.length).toEqual(2);
    });

    test('returns no configTemplates if index is substring of indexPatterns', () => {
      const configTemplatesToInstall = getConfigTemplatesToInstall(
        mockConfigTemplates,
        mockInstalledJobIds,
        ['winlogbeat-**']
      );
      expect(configTemplatesToInstall.length).toEqual(0);
    });
  });

  describe('getJobsToDisplay', () => {
    test('returns empty array when null summaryData provided', () => {
      const jobsToDisplay = getJobsToDisplay(null, mockEmbeddedJobIds, false, false);
      expect(jobsToDisplay.length).toEqual(0);
    });

    test('returns all DisplayJobs', () => {
      const jobsToDisplay = getJobsToDisplay(
        mockJobsSummaryResponse,
        mockEmbeddedJobIds,
        false,
        false
      );
      expect(jobsToDisplay.length).toEqual(4);
    });

    test('returns DisplayJobs matching only embeddedJobs', () => {
      const jobsToDisplay = getJobsToDisplay(
        mockJobsSummaryResponse,
        mockEmbeddedJobIds,
        true,
        false
      );
      expect(jobsToDisplay.length).toEqual(3);
    });

    test('returns only custom DisplayJobs from jobsSummary', () => {
      const jobsToDisplay = getJobsToDisplay(
        mockJobsSummaryResponse,
        mockEmbeddedJobIds,
        false,
        true
      );
      expect(jobsToDisplay.length).toEqual(1);
    });
  });

  describe('searchFilter', () => {
    test('returns all jobs when nullfilterQuery is provided', () => {
      const jobsToDisplay = searchFilter(mockJobsSummaryResponse);
      expect(jobsToDisplay.length).toEqual(mockJobsSummaryResponse.length);
    });

    test('returns correct DisplayJobs when filterQuery matches job.id', () => {
      const jobsToDisplay = searchFilter(mockJobsSummaryResponse, 'rare');
      expect(jobsToDisplay.length).toEqual(3);
    });

    test('returns correct DisplayJobs when filterQuery matches job.description', () => {
      const jobsToDisplay = searchFilter(mockJobsSummaryResponse, 'high number');
      expect(jobsToDisplay.length).toEqual(1);
    });
  });
});
