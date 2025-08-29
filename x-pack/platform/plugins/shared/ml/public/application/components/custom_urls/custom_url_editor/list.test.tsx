/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { CustomUrlListProps } from './list';
import { CustomUrlList, findDataViewId } from './list';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

import type { DataViewListItem } from '@kbn/data-views-plugin/common';
import type { DataFrameAnalyticsConfig } from '@kbn/ml-data-frame-analytics-utils';
import type { MlKibanaUrlConfig } from '@kbn/ml-anomaly-utils';
import { parseUrlState } from '@kbn/ml-url-state';

jest.mock('@kbn/ml-url-state', () => ({
  parseUrlState: jest.fn(),
}));

jest.mock('../../../contexts/kibana');

const mockDataViews = {
  get: jest.fn(),
};

jest.mock('../../../contexts/kibana', () => ({
  useMlKibana: () => ({
    services: {
      http: { basePath: { get: () => '' } },
      data: { dataViews: mockDataViews },
    },
  }),
  useMlApi: () => ({}),
}));

const TEST_CUSTOM_URLS = {
  dashboard: {
    url_name: 'Show dashboard',
    time_range: '1h',
    url_value:
      'dashboards#/view/52ea8840-bbef-11e8-a04d-b1701b2b977e?_g=' +
      "(time:(from:'$earliest$',mode:absolute,to:'$latest$'))&" +
      '_a=(filters:!(),query:(language:lucene,query:\'airline:"$airline$"\'))',
  },
  discover: {
    url_name: 'Show data',
    time_range: 'auto',
    url_value:
      "discover#/?_g=(time:(from:'$earliest$',mode:absolute,to:'$latest$'))&_a=" +
      '(index:e532ba80-b76f-11e8-a9dc-37914a458883,query:(language:lucene,query:\'airline:"$airline$"\'))',
  },
  other: {
    url_name: 'Show airline',
    time_range: 'auto',
    url_value: 'http://airlinecodes.info/airline-code-$airline$',
  },
};

const mockDataViewListItems: DataViewListItem[] = [
  {
    id: 'logs-*',
    title: 'logs-*',
    type: 'index-pattern',
    name: 'Logs Data View',
  },
  {
    id: 'metrics-*',
    title: 'metrics-*',
    type: 'index-pattern',
    name: 'Metrics Data View',
  },
  {
    id: 'source-index',
    title: 'source-index',
    type: 'index-pattern',
    name: 'Source Index Data View',
  },
  {
    id: 'dest-index',
    title: 'dest-index',
    type: 'index-pattern',
    name: 'Destination Index Data View',
  },
  {
    id: 'source-index,other-index',
    title: 'source-index,other-index',
    type: 'index-pattern',
    name: 'Combined Indexes Data View',
  },
];

const mockDFAJob: DataFrameAnalyticsConfig = {
  id: 'test-job',
  source: {
    index: ['source-index'],
  },
  dest: {
    index: 'dest-index',
    results_field: 'ml',
  },
  analysis: {
    classification: {
      dependent_variable: 'target',
      training_percent: 80,
      num_top_feature_importance_values: 2,
    },
  },
};

jest.mock('../../../services/toast_notification_service', () => ({
  useToastNotificationService: () => {
    return {
      displayErrorToast: jest.fn(),
    };
  },
}));

const mockParseUrlState = parseUrlState as jest.MockedFunction<typeof parseUrlState>;

beforeEach(() => {
  jest.clearAllMocks();

  mockParseUrlState.mockImplementation((url: string) => {
    if (url?.includes('discover#') && url.includes('index:e532ba80-b76f-11e8-a9dc-37914a458883')) {
      return {
        _a: { index: 'e532ba80-b76f-11e8-a9dc-37914a458883' },
      };
    }
    if (url?.includes('discover#') && url.includes('index:logs-*')) {
      return {
        _a: { index: 'logs-*' },
      };
    }
    // Always return an object with _a property to prevent undefined errors
    return { _a: {} };
  });
});

afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

function renderCustomUrlList(
  customUrls: any[],
  options: {
    onChange?: jest.Mock;
    job?: any;
    dataViewListItems?: any[];
  } = {}
) {
  const {
    onChange = jest.fn(),
    job = mockDFAJob,
    dataViewListItems = mockDataViewListItems,
  } = options;

  const props: CustomUrlListProps = {
    job,
    customUrls,
    onChange,
    dataViewListItems,
  };

  return render(
    <IntlProvider>
      <CustomUrlList {...props} />
    </IntlProvider>
  );
}

describe('CustomUrlList', () => {
  const setCustomUrls = jest.fn();

  test('renders a list of custom URLs', async () => {
    const customUrls = [
      TEST_CUSTOM_URLS.discover,
      TEST_CUSTOM_URLS.dashboard,
      TEST_CUSTOM_URLS.other,
    ];

    const { container, unmount } = renderCustomUrlList(customUrls, {
      onChange: setCustomUrls,
      job: {
        job_id: 'test',
        analysis_config: {},
        source: { index: ['test-index'] },
        dest: { index: 'test-dest' },
      } as unknown as any,
      dataViewListItems: [],
    });

    // Wait for async useEffect operations to complete
    await waitFor(() => {
      expect(
        container.querySelector('[data-test-subj="mlJobEditCustomUrlsList"]')
      ).toBeInTheDocument();
    });
    expect(container.firstChild).toMatchSnapshot();
    unmount();
  });

  test('switches custom URL field to textarea and calls setCustomUrls on change', async () => {
    const customUrls = [
      TEST_CUSTOM_URLS.discover,
      TEST_CUSTOM_URLS.dashboard,
      TEST_CUSTOM_URLS.other,
    ];

    const { getByTestId, unmount } = renderCustomUrlList(customUrls, {
      onChange: setCustomUrls,
      job: {
        job_id: 'test',
        analysis_config: {},
        source: { index: ['test-index'] },
        dest: { index: 'test-dest' },
      } as unknown as any,
      dataViewListItems: [],
    });
    const user = userEvent.setup();

    await waitFor(() => {
      expect(getByTestId('mlJobEditCustomUrlInput_0')).toBeInTheDocument();
    });

    const input = getByTestId('mlJobEditCustomUrlInput_0');
    await user.click(input);

    const textarea = getByTestId('mlJobEditCustomUrlTextarea_0');
    expect(textarea).toBeInTheDocument();

    await user.type(textarea, 'Edit');
    expect(setCustomUrls).toHaveBeenCalled();
    unmount();
  });
});

describe('checkTimeRangeVisibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('should display time range field when', () => {
    it('index has timestamp field', async () => {
      mockDataViews.get.mockResolvedValue({
        timeFieldName: '@timestamp',
      });

      const customUrls = [
        {
          url_name: 'Dashboard Test',
          time_range: 'auto',
          url_value: 'dashboards#/view/test-dashboard',
        },
      ];
      const { container, unmount } = renderCustomUrlList(customUrls);

      // Wait for async checkTimeRangeVisibility to complete
      await waitFor(() => {
        expect(container.querySelector('input[placeholder="auto"]')).toBeInTheDocument();
      });

      unmount();
    });

    it('time range is auto', async () => {
      mockDataViews.get.mockResolvedValue({
        timeFieldName: '@timestamp',
      });

      const customUrls = [
        {
          url_name: 'Auto Time Range Test',
          time_range: 'auto',
          url_value: 'dashboards#/view/auto-test-dashboard',
        },
      ];

      const { container, unmount } = renderCustomUrlList(customUrls);

      await waitFor(() => {
        expect(container.querySelector('input[placeholder="auto"]')).toBeInTheDocument();
      });

      unmount();
    });

    it('time range is an interval', async () => {
      mockDataViews.get.mockResolvedValue({
        timeFieldName: '@timestamp',
      });

      const customUrls = [
        {
          ...TEST_CUSTOM_URLS.dashboard,
          time_range: '1h',
        },
      ];

      const { container, unmount } = renderCustomUrlList(customUrls);

      await waitFor(() => {
        expect(container.querySelector('input[value="1h"]')).toBeInTheDocument();
      });

      unmount();
    });
  });

  describe('should not display time range field when', () => {
    it('index does not have timestamp field', async () => {
      mockDataViews.get.mockResolvedValue({
        timeFieldName: null,
      });

      const customUrls = [
        {
          url_name: 'No Timestamp Test',
          time_range: 'auto',
          url_value: 'dashboards#/view/no-timestamp-dashboard',
        },
      ];
      const { container, unmount } = renderCustomUrlList(customUrls);

      await waitFor(() => {
        expect(container.querySelector('input[placeholder="auto"]')).not.toBeInTheDocument();
      });

      unmount();
    });

    it('user has selected custom time range in editor', async () => {
      mockDataViews.get.mockResolvedValue({
        timeFieldName: '@timestamp',
      });

      const customUrls = [
        {
          url_name: 'Custom Time Range Test',
          time_range: 'auto',
          url_value: 'dashboards#/view/custom-time-dashboard',
          is_custom_time_range: true, // Custom time range selected
        },
      ];

      const { container, unmount } = renderCustomUrlList(customUrls);

      await waitFor(() => {
        expect(container.querySelector('input[placeholder="auto"]')).not.toBeInTheDocument();
      });

      unmount();
    });

    it('data view cannot be found', async () => {
      // Mock dataViews.get to throw error (data view not found)
      mockDataViews.get.mockRejectedValue(new Error('Data view not found'));

      const customUrls = [
        {
          url_name: 'Data View Error Test',
          time_range: 'auto',
          url_value: 'dashboards#/view/error-dashboard',
        },
      ];
      const { container, unmount } = renderCustomUrlList(customUrls);

      await waitFor(() => {
        expect(container.querySelector('input[placeholder="auto"]')).not.toBeInTheDocument();
      });

      unmount();
    });
  });

  describe('should display time range field when no data view info available', () => {
    it('no data view ID can be determined', async () => {
      const customUrls = [
        {
          url_name: 'Test Dashboard',
          time_range: 'auto',
          url_value: 'dashboards#/view/unknown-dashboard-id',
          // Explicitly ensure is_custom_time_range is false
        },
      ];

      // Use empty data view list so no ID is found
      const { container, unmount } = renderCustomUrlList(customUrls, { dataViewListItems: [] });

      await waitFor(() => {
        // Based on business logic: if (!dataViewId) return true; - should show time range field
        const timeRangeInput = container.querySelector('input[placeholder="auto"]');
        expect(timeRangeInput).toBeInTheDocument();
      });

      unmount();
    });
  });

  describe('edge cases', () => {
    it('should handle multiple custom URLs with mixed timestamp support', async () => {
      mockDataViews.get
        .mockResolvedValueOnce({ timeFieldName: '@timestamp' }) // First URL has timestamp
        .mockResolvedValueOnce({ timeFieldName: null }); // Second URL has no timestamp

      const customUrls = [TEST_CUSTOM_URLS.dashboard, TEST_CUSTOM_URLS.discover];
      const { container, unmount } = renderCustomUrlList(customUrls);

      // Should render time range for first URL only
      await waitFor(() => {
        const timeRangeInputs = container.querySelectorAll('input[placeholder="auto"]');
        expect(timeRangeInputs).toHaveLength(1);
      });

      unmount();
    });

    it('should default to showing time range when data view ID cannot be determined', async () => {
      // This covers the case where findDataViewId returns undefined
      const customUrls = [
        {
          url_name: 'Unknown URL',
          url_value: 'dashboards#/view/nonexistent',
          time_range: 'auto',
        },
      ];

      const { container, unmount } = renderCustomUrlList(customUrls, { dataViewListItems: [] });

      // Should show time range by default when unable to determine data view
      await waitFor(() => {
        expect(container.querySelector('input[placeholder="auto"]')).toBeInTheDocument();
      });

      unmount();
    });
  });
});

describe('findDataViewId', () => {
  describe('dashboard URLs', () => {
    it('should return data view ID for destination index when not a partial job', () => {
      const result = findDataViewId(
        mockDFAJob,
        TEST_CUSTOM_URLS.dashboard,
        mockDataViewListItems,
        false // not partial
      );

      expect(result).toBe(mockDFAJob.dest.index);
    });
    it('should return data view ID for source index when a partial job', () => {
      const result = findDataViewId(
        mockDFAJob,
        TEST_CUSTOM_URLS.dashboard,
        mockDataViewListItems,
        true // partial job
      );

      expect(result).toBe(mockDFAJob.source.index[0]);
    });

    it('should return data view ID for source index when partial job', () => {
      const result = findDataViewId(
        mockDFAJob,
        TEST_CUSTOM_URLS.dashboard,
        mockDataViewListItems,
        true // partial job
      );

      expect(result).toBe(mockDFAJob.source.index[0]);
    });

    it('should fallback to source index when destination index not found', () => {
      const jobWithMissingDest = {
        ...mockDFAJob,
        dest: { index: 'non-existent-dest' },
      };

      const result = findDataViewId(
        jobWithMissingDest,
        TEST_CUSTOM_URLS.dashboard,
        mockDataViewListItems,
        false
      );

      expect(result).toBe(mockDFAJob.source.index[0]);
    });

    it('should handle array source indexes', () => {
      const jobWithArraySource = {
        ...mockDFAJob,
        source: { index: ['source-index', 'other-index'] },
      };

      const result = findDataViewId(
        jobWithArraySource,
        TEST_CUSTOM_URLS.dashboard,
        mockDataViewListItems,
        true
      );

      expect(result).toBe(jobWithArraySource.source.index.join(','));
    });

    it('should return undefined when no matching data view found', () => {
      const jobWithUnknownIndexes = {
        ...mockDFAJob,
        source: { index: 'unknown-source' },
        dest: { index: 'unknown-dest' },
      };

      const result = findDataViewId(
        jobWithUnknownIndexes,
        TEST_CUSTOM_URLS.dashboard,
        mockDataViewListItems,
        false
      );

      expect(result).toBeUndefined();
    });
  });

  describe('discover URLs', () => {
    it('should extract data view ID from URL state', () => {
      mockParseUrlState.mockReturnValue({
        _a: { index: 'logs-*' },
      });

      const result = findDataViewId(
        mockDFAJob,
        TEST_CUSTOM_URLS.discover,
        mockDataViewListItems,
        false
      );

      expect(parseUrlState).toHaveBeenCalledWith(TEST_CUSTOM_URLS.discover.url_value);
      expect(result).toBe('logs-*');
    });

    it('should return undefined when URL state parsing fails', () => {
      const malformedDiscoverUrl: MlKibanaUrlConfig = {
        url_name: 'Test Discover',
        url_value: '/app/discover#/malformed-url',
        time_range: 'auto',
      };

      mockParseUrlState.mockReturnValue({});

      const result = findDataViewId(mockDFAJob, malformedDiscoverUrl, mockDataViewListItems, false);

      expect(result).toBeUndefined();
    });

    it('should return undefined when _a.index is not present in URL state', () => {
      mockParseUrlState.mockReturnValue({
        _a: { columns: [] },
      });

      const result = findDataViewId(
        mockDFAJob,
        TEST_CUSTOM_URLS.discover,
        mockDataViewListItems,
        false
      );

      expect(result).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should handle missing dataViewListItems', () => {
      const result = findDataViewId(
        mockDFAJob,
        TEST_CUSTOM_URLS.dashboard,
        undefined, // no data view list items
        false
      );

      expect(result).toBeUndefined();
    });

    it('should handle empty dataViewListItems array', () => {
      const result = findDataViewId(
        mockDFAJob,
        TEST_CUSTOM_URLS.dashboard,
        [], // empty array
        false
      );

      expect(result).toBeUndefined();
    });
  });
});
