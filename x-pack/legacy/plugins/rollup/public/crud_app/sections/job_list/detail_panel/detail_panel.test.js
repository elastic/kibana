/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerTestBed } from '../../../../../../../../test_utils';
import { getJob } from '../../../../../fixtures';
import { rollupJobsStore } from '../../../store';
import { DetailPanel } from './detail_panel';
import {
  JOB_DETAILS_TAB_SUMMARY,
  JOB_DETAILS_TAB_TERMS,
  JOB_DETAILS_TAB_HISTOGRAM,
  JOB_DETAILS_TAB_METRICS,
  JOB_DETAILS_TAB_JSON,
  tabToHumanizedMap,
} from '../../components';

jest.mock('../../../services', () => {
  const services = require.requireActual('../../../services');
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

const initTestBed = registerTestBed(DetailPanel, { defaultProps, store: rollupJobsStore });

describe('<DetailPanel />', () => {
  describe('layout', () => {
    let component;
    let find;
    let exists;

    beforeEach(() => {
      ({ component, find } = initTestBed());
    });

    it('should have the title set to the current Job "id"', () => {
      const { job } = defaultProps;
      const title = find('rollupJobDetailsFlyoutTitle');
      expect(title.length).toBe(1);
      expect(title.text()).toEqual(job.id);
    });

    it("should have children if it's open", () => {
      expect(component.find('DetailPanelUi').children().length).toBeTruthy();
    });

    it('should *not* have children if its closed', () => {
      ({ component } = initTestBed({ isOpen: false }));
      expect(component.find('DetailPanelUi').children().length).toBeFalsy();
    });

    it('should show a loading when the job is loading', () => {
      ({ component, find, exists } = initTestBed({ isLoading: true }));
      const loading = find('rollupJobDetailLoading');
      expect(loading.length).toBeTruthy();
      expect(loading.text()).toEqual('Loading rollup job...');

      // Make sure the title and the tabs are visible
      expect(exists('detailPanelTabSelected')).toBeTruthy();
      expect(exists('rollupJobDetailsFlyoutTitle')).toBeTruthy();
    });

    it('should display a message when no job is provided', () => {
      ({ component, find } = initTestBed({ job: undefined }));
      expect(find('rollupJobDetailJobNotFound').text()).toEqual('Rollup job not found');
    });
  });

  describe('tabs', () => {
    const tabActive = JOB_DETAILS_TAB_SUMMARY;
    const { component } = initTestBed({ panelType: tabActive });
    const tabs = component.find('EuiTab');
    const getTab = id => {
      const found = tabs.findWhere(tab => {
        return tab.text() === tabToHumanizedMap[id].props.defaultMessage;
      });
      return found.first();
    };

    it('should have 5 tabs visible', () => {
      const tabsLabel = tabs.map(tab => tab.text());

      expect(tabsLabel).toEqual(['Summary', 'Terms', 'Histogram', 'Metrics', 'JSON']);
    });

    it('should set default selected tab to the "panelType" prop provided', () => {
      const tab = getTab(tabActive);
      expect(tab.props().isSelected).toEqual(true);
    });

    it('should select the tab when clicking on it', () => {
      const { job, openDetailPanel } = defaultProps;
      const termsTab = getTab(JOB_DETAILS_TAB_TERMS);

      termsTab.simulate('click');

      expect(openDetailPanel.mock.calls.length).toBe(1);
      expect(openDetailPanel.mock.calls[0][0]).toEqual({
        jobId: job.id,
        panelType: JOB_DETAILS_TAB_TERMS,
      });
    });
  });

  describe('job detail', () => {
    describe('summary tab content', () => {
      // Init testBed on the SUMMARY tab
      const panelType = JOB_DETAILS_TAB_SUMMARY;
      const { find } = initTestBed({ panelType });

      it('should have a "Logistics", "Date histogram" and "Stats" section', () => {
        const expectedSections = ['Logistics', 'DateHistogram', 'Stats'];
        const sectionsFound = expectedSections.reduce((sectionsFound, section) => {
          if (find(`rollupJobDetailSummary${section}Section`).length) {
            sectionsFound.push(section);
          }
          return sectionsFound;
        }, []);

        expect(sectionsFound).toEqual(expectedSections);
      });

      describe('Logistics section', () => {
        const LOGISTICS_SUBSECTIONS = ['IndexPattern', 'RollupIndex', 'Cron', 'Delay'];

        it('should have "Index pattern", "Rollup index", "Cron" and "Delay" subsections', () => {
          const logisticsSubsectionsTitles = LOGISTICS_SUBSECTIONS.reduce(
            (subSections, subSection) => {
              if (find(`rollupJobDetailLogistics${subSection}Title`)) {
                subSections.push(subSection);
              }
              return subSections;
            },
            []
          );
          expect(logisticsSubsectionsTitles).toEqual(LOGISTICS_SUBSECTIONS);
        });

        it('should set the correct job value for each of the subsection', () => {
          LOGISTICS_SUBSECTIONS.forEach(subSection => {
            const wrapper = find(`rollupJobDetailLogistics${subSection}Description`);
            expect(wrapper.length).toBe(1);
            const description = wrapper.text();

            switch (subSection) {
              case 'IndexPattern':
                expect(description).toEqual(defaultJob.indexPattern);
                break;
              case 'Cron':
                expect(description).toEqual(defaultJob.rollupCron);
                break;
              case 'Delay':
                expect(description).toEqual(defaultJob.rollupDelay);
                break;
              case 'RollupIndex':
                expect(description).toEqual(defaultJob.rollupIndex);
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
          const dateHistogramSubsections = DATE_HISTOGRAMS_SUBSECTIONS.reduce(
            (subSections, subSection) => {
              if (find(`rollupJobDetailDateHistogram${subSection}Title`)) {
                subSections.push(subSection);
              }
              return subSections;
            },
            []
          );
          expect(dateHistogramSubsections).toEqual(DATE_HISTOGRAMS_SUBSECTIONS);
        });

        it('should set the correct job value for each of the subsection', () => {
          DATE_HISTOGRAMS_SUBSECTIONS.forEach(subSection => {
            const wrapper = find(`rollupJobDetailDateHistogram${subSection}Description`);
            expect(wrapper.length).toBe(1);
            const description = wrapper.text();

            switch (subSection) {
              case 'TimeField':
                expect(description).toEqual(defaultJob.dateHistogramField);
                break;
              case 'Interval':
                expect(description).toEqual(defaultJob.dateHistogramInterval);
                break;
              case 'Timezone':
                expect(description).toEqual(defaultJob.dateHistogramTimeZone);
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
          const statsSubSections = STATS_SUBSECTIONS.reduce((subSections, subSection) => {
            if (find(`rollupJobDetailStats${subSection}Title`)) {
              subSections.push(subSection);
            }
            return subSections;
          }, []);
          expect(statsSubSections).toEqual(STATS_SUBSECTIONS);
        });

        it('should set the correct job value for each of the subsection', () => {
          STATS_SUBSECTIONS.forEach(subSection => {
            const wrapper = find(`rollupJobDetailStats${subSection}Description`);
            expect(wrapper.length).toBe(1);
            const description = wrapper.text();

            switch (subSection) {
              case 'DocumentsProcessed':
                expect(description).toEqual(defaultJob.documentsProcessed.toString());
                break;
              case 'PagesProcessed':
                expect(description).toEqual(defaultJob.pagesProcessed.toString());
                break;
              case 'RollupsIndexed':
                expect(description).toEqual(defaultJob.rollupsIndexed.toString());
                break;
              case 'TriggerCount':
                expect(description).toEqual(defaultJob.triggerCount.toString());
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
          const statsSection = find('rollupJobDetailSummaryStatsSection');
          expect(statsSection.length).toBe(1);
          expect(defaultJob.status).toEqual('stopped'); // make sure status is Stopped
          expect(statsSection.find('EuiHealth').text()).toEqual('Stopped');
        });
      });
    });

    describe('terms tab content', () => {
      // Init testBed on the TERMS tab
      const panelType = JOB_DETAILS_TAB_TERMS;
      const { table } = initTestBed({ panelType });
      const { tableCellsValues } = table.getMetaData('detailPanelTermsTabTable');

      it('should list the Job terms fields', () => {
        const expected = defaultJob.terms.map(term => [term.name]);
        expect(tableCellsValues).toEqual(expected);
      });
    });

    describe('histogram tab content', () => {
      // Init testBed on the HISTOGRAM tab
      const panelType = JOB_DETAILS_TAB_HISTOGRAM;
      const { table } = initTestBed({ panelType });
      const { tableCellsValues } = table.getMetaData('detailPanelHistogramTabTable');

      it('should list the Job histogram fields', () => {
        const expected = defaultJob.histogram.map(h => [h.name]);
        expect(tableCellsValues).toEqual(expected);
      });
    });

    describe('metrics tab content', () => {
      // Init testBed on the METRICS tab
      const panelType = JOB_DETAILS_TAB_METRICS;
      const { table } = initTestBed({ panelType });
      const { tableCellsValues } = table.getMetaData('detailPanelMetricsTabTable');

      it('should list the Job metrics fields and their types', () => {
        const expected = defaultJob.metrics.map(metric => [metric.name, metric.types.join(', ')]);
        expect(tableCellsValues).toEqual(expected);
      });
    });

    describe('JSON tab content', () => {
      // Init testBed on the JSON tab
      const panelType = JOB_DETAILS_TAB_JSON;
      const { find } = initTestBed({ panelType });
      const tabContent = find('rollupJobDetailTabContent');

      it('should render the "EuiCodeEditor" with the job "json" data', () => {
        const euiCodeEditor = tabContent.find('EuiCodeEditor');
        expect(euiCodeEditor.length).toBeTruthy();
        expect(JSON.parse(euiCodeEditor.props().value)).toEqual(defaultJob.json);
      });
    });
  });
});
