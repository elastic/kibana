/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { Provider } from 'react-redux';
import { getJob } from '../../../../../fixtures';
import { createRollupJobsStore } from '../../../store';
import { DetailPanel } from './detail_panel';
import {
  JOB_DETAILS_TAB_SUMMARY,
  JOB_DETAILS_TAB_TERMS,
  JOB_DETAILS_TAB_HISTOGRAM,
  JOB_DETAILS_TAB_METRICS,
  JOB_DETAILS_TAB_JSON,
} from '../../components';

jest.mock('../../../../kibana_services', () => {
  const services = jest.requireActual('../../../../kibana_services');
  return {
    ...services,
    trackUiMetric: jest.fn(),
  };
});

const defaultJob = getJob();

const defaultProps = {
  isOpen: true,
  isLoading: false,
  job: defaultJob,
  jobId: defaultJob.id,
  panelType: JOB_DETAILS_TAB_SUMMARY,
  closeDetailPanel: jest.fn(),
  openDetailPanel: jest.fn(),
};

const renderComponent = (overrides = {}) => {
  const store = createRollupJobsStore();
  renderWithI18n(
    <Provider store={store}>
      <DetailPanel {...defaultProps} {...overrides} />
    </Provider>
  );
  return store;
};

describe('<DetailPanel />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('layout', () => {
    it('should have the title set to the current Job "id"', () => {
      renderComponent();
      const { job } = defaultProps;
      expect(screen.getByTestId('rollupJobDetailsFlyoutTitle')).toHaveTextContent(job.id);
    });

    it("should have children if it's open", () => {
      renderComponent();
      expect(screen.getByTestId('rollupJobDetailFlyout')).toBeInTheDocument();
    });

    it('should *not* have children if its closed', () => {
      renderComponent({ isOpen: false });
      expect(screen.queryByTestId('rollupJobDetailFlyout')).not.toBeInTheDocument();
    });

    it('should show a loading when the job is loading', () => {
      renderComponent({ isLoading: true });
      const loading = screen.getByTestId('rollupJobDetailLoading');
      expect(loading).toHaveTextContent('Loading rollup job…');

      // Make sure the title and the tabs are visible
      expect(screen.getByTestId('detailPanelTabSelected')).toBeInTheDocument();
      expect(screen.getByTestId('rollupJobDetailsFlyoutTitle')).toBeInTheDocument();
    });

    it('should display a message when no job is provided', () => {
      renderComponent({ job: undefined });
      expect(screen.getByTestId('rollupJobDetailJobNotFound')).toHaveTextContent(
        'Rollup job not found'
      );
    });
  });

  describe('tabs', () => {
    const tabActive = JOB_DETAILS_TAB_SUMMARY;
    beforeEach(() => {
      renderComponent({ panelType: tabActive });
    });

    it('should have 5 tabs visible', () => {
      ['Summary', 'Terms', 'Histogram', 'Metrics', 'JSON'].forEach((label) => {
        expect(screen.getByText(label)).toBeInTheDocument();
      });
    });

    it('should set default selected tab to the "panelType" prop provided', () => {
      expect(screen.getByTestId('detailPanelTabSelected')).toHaveTextContent('Summary');
    });

    it('should select the tab when clicking on it', () => {
      const { job, openDetailPanel } = defaultProps;
      fireEvent.click(screen.getByText('Terms'));

      expect(openDetailPanel).toHaveBeenCalledTimes(1);
      expect(openDetailPanel).toHaveBeenCalledWith({
        jobId: job.id,
        panelType: JOB_DETAILS_TAB_TERMS,
      });
    });
  });

  describe('job detail', () => {
    describe('summary tab content', () => {
      const panelType = JOB_DETAILS_TAB_SUMMARY;
      beforeEach(() => {
        renderComponent({ panelType });
      });

      it('should have a "Logistics", "Date histogram" and "Stats" section', () => {
        expect(screen.getByTestId('rollupJobDetailSummaryLogisticsSection')).toBeInTheDocument();
        expect(
          screen.getByTestId('rollupJobDetailSummaryDateHistogramSection')
        ).toBeInTheDocument();
        expect(screen.getByTestId('rollupJobDetailSummaryStatsSection')).toBeInTheDocument();
      });

      describe('Logistics section', () => {
        const LOGISTICS_SUBSECTIONS = ['IndexPattern', 'RollupIndex', 'Cron', 'Delay'];

        it('should have "Index pattern", "Rollup index", "Cron" and "Delay" subsections', () => {
          expect(screen.getByText('Index pattern')).toBeInTheDocument();
          expect(screen.getByText('Rollup index')).toBeInTheDocument();
          expect(screen.getByText('Cron')).toBeInTheDocument();
          expect(screen.getByText('Delay')).toBeInTheDocument();
        });

        it('should set the correct job value for each of the subsection', () => {
          LOGISTICS_SUBSECTIONS.forEach((subSection) => {
            switch (subSection) {
              case 'IndexPattern':
                expect(
                  screen.getByTestId('rollupJobDetailLogisticsIndexPatternDescription')
                ).toHaveTextContent(defaultJob.indexPattern);
                break;
              case 'Cron':
                expect(
                  screen.getByTestId('rollupJobDetailLogisticsCronDescription')
                ).toHaveTextContent(defaultJob.rollupCron);
                break;
              case 'Delay':
                expect(
                  screen.getByTestId('rollupJobDetailLogisticsDelayDescription')
                ).toHaveTextContent(defaultJob.rollupDelay);
                break;
              case 'RollupIndex':
                expect(
                  screen.getByTestId('rollupJobDetailLogisticsRollupIndexDescription')
                ).toHaveTextContent(defaultJob.rollupIndex);
                break;
              default:
                // Should never get here... if it does a section is missing in the constant
                throw new Error(
                  'Should not get here. The constant LOGISTICS_SUBSECTIONS is probably missing a new subsection'
                );
            }
          });
        });
      });

      describe('Date histogram section', () => {
        const DATE_HISTOGRAMS_SUBSECTIONS = ['TimeField', 'Timezone', 'Interval'];

        it('should have "Time field", "Timezone", "Interval" subsections', () => {
          expect(screen.getByText('Time field')).toBeInTheDocument();
          expect(screen.getByText('Timezone')).toBeInTheDocument();
          expect(screen.getByText('Interval')).toBeInTheDocument();
        });

        it('should set the correct job value for each of the subsection', () => {
          DATE_HISTOGRAMS_SUBSECTIONS.forEach((subSection) => {
            switch (subSection) {
              case 'TimeField':
                expect(
                  screen.getByTestId('rollupJobDetailDateHistogramTimeFieldDescription')
                ).toHaveTextContent(defaultJob.dateHistogramField);
                break;
              case 'Interval':
                expect(
                  screen.getByTestId('rollupJobDetailDateHistogramIntervalDescription')
                ).toHaveTextContent(defaultJob.dateHistogramInterval);
                break;
              case 'Timezone':
                expect(
                  screen.getByTestId('rollupJobDetailDateHistogramTimezoneDescription')
                ).toHaveTextContent(defaultJob.dateHistogramTimeZone);
                break;
              default:
                // Should never get here... if it does a section is missing in the constant
                throw new Error(
                  'Should not get here. The constant DATE_HISTOGRAMS_SUBSECTIONS is probably missing a new subsection'
                );
            }
          });
        });
      });

      describe('Stats section', () => {
        const STATS_SUBSECTIONS = [
          'DocumentsProcessed',
          'PagesProcessed',
          'RollupsIndexed',
          'TriggerCount',
        ];

        it('should have "Documents processed", "Pages processed", "Rollups indexed" and "Trigger count" subsections', () => {
          expect(screen.getByText('Documents processed')).toBeInTheDocument();
          expect(screen.getByText('Pages processed')).toBeInTheDocument();
          expect(screen.getByText('Rollups indexed')).toBeInTheDocument();
          expect(screen.getByText('Trigger count')).toBeInTheDocument();
        });

        it('should set the correct job value for each of the subsection', () => {
          STATS_SUBSECTIONS.forEach((subSection) => {
            switch (subSection) {
              case 'DocumentsProcessed':
                expect(
                  screen.getByTestId('rollupJobDetailStatsDocumentsProcessedDescription')
                ).toHaveTextContent(String(defaultJob.documentsProcessed));
                break;
              case 'PagesProcessed':
                expect(
                  screen.getByTestId('rollupJobDetailStatsPagesProcessedDescription')
                ).toHaveTextContent(String(defaultJob.pagesProcessed));
                break;
              case 'RollupsIndexed':
                expect(
                  screen.getByTestId('rollupJobDetailStatsRollupsIndexedDescription')
                ).toHaveTextContent(String(defaultJob.rollupsIndexed));
                break;
              case 'TriggerCount':
                expect(
                  screen.getByTestId('rollupJobDetailStatsTriggerCountDescription')
                ).toHaveTextContent(String(defaultJob.triggerCount));
                break;
              default:
                // Should never get here... if it does a section is missing in the constant
                throw new Error(
                  'Should not get here. The constant STATS_SUBSECTIONS is probably missing a new subsection'
                );
            }
          });
        });

        it('should display the job status', () => {
          expect(defaultJob.status).toEqual('stopped'); // make sure status is Stopped
          expect(screen.getByTestId('rollupJobDetailSummaryStatsSection')).toHaveTextContent(
            'Stopped'
          );
        });
      });
    });

    describe('terms tab content', () => {
      const panelType = JOB_DETAILS_TAB_TERMS;
      beforeEach(() => {
        renderComponent({ panelType });
      });

      it('should list the Job terms fields', () => {
        const table = screen.getByTestId('detailPanelTermsTabTable');
        defaultJob.terms.forEach((term) => {
          expect(table).toHaveTextContent(term.name);
        });
      });
    });

    describe('histogram tab content', () => {
      const panelType = JOB_DETAILS_TAB_HISTOGRAM;
      beforeEach(() => {
        renderComponent({ panelType });
      });

      it('should list the Job histogram fields', () => {
        const table = screen.getByTestId('detailPanelHistogramTabTable');
        defaultJob.histogram.forEach((h) => {
          expect(table).toHaveTextContent(h.name);
        });
      });
    });

    describe('metrics tab content', () => {
      const panelType = JOB_DETAILS_TAB_METRICS;
      beforeEach(() => {
        renderComponent({ panelType });
      });

      it('should list the Job metrics fields and their types', () => {
        const table = screen.getByTestId('detailPanelMetricsTabTable');
        defaultJob.metrics.forEach((metric) => {
          expect(table).toHaveTextContent(metric.name);
          expect(table).toHaveTextContent(metric.types.slice().sort().join(', '));
        });
      });
    });

    describe('JSON tab content', () => {
      const panelType = JOB_DETAILS_TAB_JSON;
      beforeEach(() => {
        renderComponent({ panelType });
      });

      it('should render the "CodeEditor" with the job "json" data', () => {
        const codeBlock = screen.getByTestId('jsonCodeBlock');
        expect(JSON.parse(codeBlock.textContent)).toEqual(defaultJob.json);
      });
    });
  });
});
