/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { JobId, ReportApiJSON } from '@kbn/reporting-common/types';

import { JobSummary, JobSummarySet } from '../types';
import { Job, ReportingAPIClient } from '@kbn/reporting-public';
import { ReportingNotifierStreamHandler } from './stream_handler';

/**
 * A test class that subclasses the main class with testable
 * methods that access private methods indirectly.
 */
class TestReportingNotifierStreamHandler extends ReportingNotifierStreamHandler {
  public testFindChangedStatusJobs(previousPending: JobId[]) {
    return this.findChangedStatusJobs(previousPending);
  }

  public testShowNotifications(jobs: JobSummarySet) {
    return this.showNotifications(jobs);
  }
}

const mockJobsFound: Job[] = [
  { id: 'job-source-mock1', status: 'completed', output: { csv_contains_formulas: false, max_size_reached: false }, payload: { title: 'specimen' } },
  { id: 'job-source-mock2', status: 'failed', output: { csv_contains_formulas: false, max_size_reached: false }, payload: { title: 'specimen' } },
  { id: 'job-source-mock3', status: 'pending', output: { csv_contains_formulas: false, max_size_reached: false }, payload: { title: 'specimen' } },
  { id: 'job-source-mock4', status: 'completed', output: { csv_contains_formulas: true, max_size_reached: false }, payload: { title: 'specimen' } },
].map((j) => new Job(j as ReportApiJSON)); // prettier-ignore

const coreSetup = coreMock.createSetup();
const jobQueueClientMock = new ReportingAPIClient(coreSetup.http, coreSetup.uiSettings, '7.15.0');
jobQueueClientMock.findForJobIds = async () => mockJobsFound;
jobQueueClientMock.getInfo = () =>
  Promise.resolve({ content: 'this is the completed report data' } as unknown as Job);
jobQueueClientMock.getError = () => Promise.resolve('this is the failed report error');
jobQueueClientMock.getManagementLink = () => '/#management';
jobQueueClientMock.getReportURL = () => '/reporting/download/job-123';

const core = coreMock.createStart();
const mockShowDanger = jest.spyOn(core.notifications.toasts, 'addDanger');
const mockShowSuccess = jest.spyOn(core.notifications.toasts, 'addSuccess');
const mockShowWarning = jest.spyOn(core.notifications.toasts, 'addWarning');

describe('stream handler', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('constructs', () => {
    const sh = new TestReportingNotifierStreamHandler(jobQueueClientMock, core);
    expect(sh).not.toBe(null);
  });

  describe('findChangedStatusJobs', () => {
    it('finds no changed status jobs from empty', (done) => {
      const sh = new TestReportingNotifierStreamHandler(jobQueueClientMock, core);
      const findJobs = sh.testFindChangedStatusJobs([]);
      findJobs.subscribe((data) => {
        expect(data).toEqual({ completed: [], failed: [] });
        done();
      });
    });

    it('finds changed status jobs', (done) => {
      const sh = new TestReportingNotifierStreamHandler(jobQueueClientMock, core);
      const findJobs = sh.testFindChangedStatusJobs([
        'job-source-mock1',
        'job-source-mock2',
        'job-source-mock3',
        'job-source-mock4',
      ]);

      findJobs.subscribe((data) => {
        expect(data).toMatchSnapshot();
        done();
      });
    });
  });

  describe('showNotifications', () => {
    it('show success', (done) => {
      const sh = new TestReportingNotifierStreamHandler(jobQueueClientMock, core);
      sh.testShowNotifications({
        completed: [
          {
            id: 'yas1',
            title: 'Yas',
            jobtype: 'yas',
            status: 'completed',
          } as JobSummary,
        ],
        failed: [],
      }).subscribe(() => {
        expect(mockShowDanger).not.toBeCalled();
        expect(mockShowSuccess).toBeCalledTimes(1);
        expect(mockShowWarning).not.toBeCalled();
        expect(mockShowSuccess.mock.calls).toMatchSnapshot();
        done();
      });
    });

    it('show max length warning', (done) => {
      const sh = new TestReportingNotifierStreamHandler(jobQueueClientMock, core);
      sh.testShowNotifications({
        completed: [
          {
            id: 'yas2',
            title: 'Yas',
            jobtype: 'yas',
            status: 'completed',
            maxSizeReached: true,
          } as JobSummary,
        ],
        failed: [],
      }).subscribe(() => {
        expect(mockShowDanger).not.toBeCalled();
        expect(mockShowSuccess).not.toBeCalled();
        expect(mockShowWarning).toBeCalledTimes(1);
        expect(mockShowWarning.mock.calls).toMatchSnapshot();
        done();
      });
    });

    it('show csv formulas warning', (done) => {
      const sh = new TestReportingNotifierStreamHandler(jobQueueClientMock, core);
      sh.testShowNotifications({
        completed: [
          {
            id: 'yas3',
            title: 'Yas',
            jobtype: 'yas',
            status: 'completed',
            csvContainsFormulas: true,
          } as JobSummary,
        ],
        failed: [],
      }).subscribe(() => {
        expect(mockShowDanger).not.toBeCalled();
        expect(mockShowSuccess).not.toBeCalled();
        expect(mockShowWarning).toBeCalledTimes(1);
        expect(mockShowWarning.mock.calls).toMatchSnapshot();
        done();
      });
    });

    it('show failed job toast', (done) => {
      const sh = new TestReportingNotifierStreamHandler(jobQueueClientMock, core);
      sh.testShowNotifications({
        completed: [],
        failed: [
          {
            id: 'yas7',
            title: 'Yas 7',
            jobtype: 'yas',
            status: 'failed',
          } as JobSummary,
        ],
      }).subscribe(() => {
        expect(mockShowSuccess).not.toBeCalled();
        expect(mockShowWarning).not.toBeCalled();
        expect(mockShowDanger).toBeCalledTimes(1);
        expect(mockShowDanger.mock.calls).toMatchSnapshot();
        done();
      });
    });

    it('show multiple toast', (done) => {
      const sh = new TestReportingNotifierStreamHandler(jobQueueClientMock, core);
      sh.testShowNotifications({
        completed: [
          {
            id: 'yas8',
            title: 'Yas 8',
            jobtype: 'yas',
            status: 'completed',
          } as JobSummary,
          {
            id: 'yas9',
            title: 'Yas 9',
            jobtype: 'yas',
            status: 'completed',
            csvContainsFormulas: true,
          } as JobSummary,
          {
            id: 'yas10',
            title: 'Yas 10',
            jobtype: 'yas',
            status: 'completed',
            maxSizeReached: true,
          } as JobSummary,
        ],
        failed: [
          {
            id: 'yas13',
            title: 'Yas 13',
            jobtype: 'yas',
            status: 'failed',
          } as JobSummary,
        ],
      }).subscribe(() => {
        expect(mockShowSuccess).toBeCalledTimes(1);
        expect(mockShowWarning).toBeCalledTimes(2);
        expect(mockShowDanger).toBeCalledTimes(1);
        done();
      });
    });
  });
});
