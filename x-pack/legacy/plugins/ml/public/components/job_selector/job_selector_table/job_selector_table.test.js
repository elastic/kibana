/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import React from 'react';
import { cleanup, fireEvent, render } from 'react-testing-library';
import { JobSelectorTable } from './job_selector_table';


jest.mock('../../../services/job_service', () => ({
  mlJobService: {
    getJob: jest.fn()
  }
}));


const props = {
  ganttBarWidth: 299,
  groupsList: [
    {
      id: 'logs',
      jobIds: ['bytes-by-geo-dest', 'machine-ram-by-source'],
      timeRange: {
        fromPx: 15.1,
        label: 'Apr 20th 2019, 20: 39 to Jun 20th 2019, 17: 45',
        widthPx: 283.89
      }
    },
    {
      id: 'ecommerce',
      jobIds: ['price-by-day'],
      timeRange: {
        fromPx: 1,
        label: 'Apr 17th 2019, 20:04 to May 18th 2019, 19:45',
        widthPx: 144.5
      }
    },
    {
      id: 'flights',
      jobIds: ['price-by-dest-city'],
      timeRange: {
        fromPx: 19.6,
        label: 'Apr 21st 2019, 20:00 to Jun 2nd 2019, 19:50',
        widthPx: 195.8
      }
    }
  ],
  jobs: [
    {
      groups: ['logs'],
      id: 'bytes-by-geo-dest',
      isRunning: false,
      isSingleMetricViewerJob: true,
      job_id: 'bytes-by-geo-dest',
      timeRange: {
        fromPx: 12.3,
        label: 'Apr 20th 2019, 20:39 to Jun 20th 2019, 17:45',
        widthPx: 228.6
      }
    },
    {
      groups: ['logs'],
      id: 'machine-ram-by-source',
      isRunning: false,
      isSingleMetricViewerJob: true,
      job_id: 'machine-ram-by-source',
      timeRange: {
        fromPx: 10,
        label: 'Apr 20th 2019, 20:39 to Jun 20th 2019, 17:45',
        widthPx: 182.9
      }
    },
    {
      groups: ['ecommerce'],
      id: 'price-by-day',
      isRunning: false,
      isSingleMetricViewerJob: true,
      job_id: 'price-by-day',
      timeRange: {
        fromPx: 1,
        label: 'Apr 17th 2019, 20:04 to May 18th 2019, 19:45',
        widthPx: 93.1
      },
    },
    {
      groups: ['test'],
      id: 'non-timeseries-job',
      isRunning: false,
      isSingleMetricViewerJob: false,
      job_id: 'non-timeseries-job',
      timeRange: {
        fromPx: 1,
        label: 'Apr 17th 2019, 20:04 to May 18th 2019, 19:45',
        widthPx: 93.1
      },
    }
  ],
  onSelection: jest.fn(),
  selectedIds: ['price-by-day'],
};

describe('JobSelectorTable', () => {
  afterEach(cleanup);

  describe('Single Selection', () => {

    test('Does not render tabs', () => {
      const singleSelectionProps = { ...props, singleSelection: 'true' };
      const { queryByRole } = render(<JobSelectorTable {...singleSelectionProps} />);
      const tabs = queryByRole('tab');
      expect(tabs).toBeNull();
    });

    test('incoming selectedId is selected in the table', () => {
      const singleSelectionProps = { ...props, singleSelection: 'true' };
      const { getByTestId } = render(<JobSelectorTable {...singleSelectionProps} />);
      const radioButton = getByTestId('price-by-day-radio-button');
      expect(radioButton.firstChild.checked).toEqual(true);
    });

    test('job cannot be selected if it is not a single metric viewer job', () => {
      const timeseriesOnlyProps = { ...props, singleSelection: 'true', timeseriesOnly: 'true' };
      const { getByTestId } = render(<JobSelectorTable {...timeseriesOnlyProps} />);
      const radioButton = getByTestId('non-timeseries-job-radio-button');
      expect(radioButton.firstChild.disabled).toEqual(true);
    });

  });

  describe('Not Single Selection', () => {

    test('renders tabs when not singleSelection', () => {
      const { getByRole } = render(<JobSelectorTable {...props} />);
      const tabs = getByRole('tab');
      expect(tabs).toBeDefined();
    });

    test('toggles content when tabs clicked', () => {
      // Default is Jobs tab so select Groups tab
      const { getByText } = render(<JobSelectorTable {...props} />);
      const groupsTab = getByText('Groups');
      fireEvent.click(groupsTab);
      const groupsTableHeader = getByText('jobs in group');
      expect(groupsTableHeader).toBeDefined();
      // switch back to Jobs tab
      const jobsTab = getByText('Jobs');
      fireEvent.click(jobsTab);
      const jobsTableHeader = getByText('job ID');
      expect(jobsTableHeader).toBeDefined();
    });

    test('incoming selectedIds are checked in the table', () => {
      const { getByTestId } = render(<JobSelectorTable {...props} />);
      const checkbox = getByTestId('price-by-day-checkbox');
      expect(checkbox.checked).toEqual(true);
    });

    test('incoming selectedIds are checked in the table when multiple ids', () => {
      const multipleSelectedIdsProps = { ...props, selectedIds: ['price-by-day', 'bytes-by-geo-dest'] };
      const { getByTestId } = render(<JobSelectorTable {...multipleSelectedIdsProps} />);
      const priceByDayCheckbox = getByTestId('price-by-day-checkbox');
      const bytesByGeoCheckbox = getByTestId('bytes-by-geo-dest-checkbox');
      const unselectedCheckbox = getByTestId('machine-ram-by-source-checkbox');
      expect(priceByDayCheckbox.checked).toEqual(true);
      expect(bytesByGeoCheckbox.checked).toEqual(true);
      expect(unselectedCheckbox.checked).toEqual(false);
    });

    test('displays group filter dropdown button', () => {
      const { getByText } = render(<JobSelectorTable {...props} />);
      const groupDropdownButton = getByText('Group');
      expect(groupDropdownButton).toBeDefined();
    });

  });

});

