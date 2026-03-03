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
import { CustomUrlList, extractDataViewIdFromCustomUrl } from './list';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

import type { DataViewListItem } from '@kbn/data-views-plugin/common';
import type { DataFrameAnalyticsConfig } from '@kbn/ml-data-frame-analytics-utils';
import type { MlKibanaUrlConfig } from '@kbn/ml-anomaly-utils';
import { parseUrlState } from '@kbn/ml-url-state';
import type { Job } from '../../../../../common';

jest.mock('@kbn/ml-url-state', () => ({
  parseUrlState: jest.fn(),
}));

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

jest.mock('../../../services/toast_notification_service', () => ({
  useToastNotificationService: () => {
    return {
      displayErrorToast: jest.fn(),
    };
  },
}));

const TEST_CUSTOM_URLS = {
  dashboard: {
    url_name: 'Show dashboard',
    time_range: 'auto',
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
  unknown: {
    url_name: 'Unknown URL',
    url_value: 'some/view/nonexistent',
    time_range: 'auto',
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

const mockADJob: Job = {
  job_id: 'test-ad-job',
  analysis_config: {
    bucket_span: '15m',
    detectors: [
      {
        function: 'mean',
        field_name: 'responsetime',
      },
    ],
  },
  data_description: {
    time_field: '@timestamp',
  },
  datafeed_config: {
    indices: ['logs-*'],
    datafeed_id: 'datafeed-test-ad-job',
    job_id: 'test-ad-job',
    query: { match_all: {} },
    delayed_data_check_config: {
      check_window: '60m',
      enabled: true, // This was missing and required
    },
  },
  allow_lazy_open: true,
  model_snapshot_retention_days: 12354123,
  results_index_name: 'string',
};

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
    job?: Job | DataFrameAnalyticsConfig;
    onChange?: jest.Mock;
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

  describe('Data Frame Analytics Job - Time Range Field Visibility', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    describe('should display time range when', () => {
      it('DFA job index has timestamp and Dashboards URL is selected', async () => {
        mockDataViews.get.mockResolvedValue({
          timeFieldName: '@timestamp',
        });

        const { container, unmount } = renderCustomUrlList([TEST_CUSTOM_URLS.dashboard]);

        // Wait for async checkTimeRangeVisibility to complete
        await waitFor(() => {
          const inputs = container.querySelectorAll(
            'input[aria-label^="Time range for custom URL"]'
          );
          expect(inputs).toHaveLength(1);
        });

        unmount();
      });
      it('DFA job index has timestamp and Dashboard time range is auto', async () => {
        mockDataViews.get.mockResolvedValue({
          timeFieldName: '@timestamp',
        });

        const { container, unmount } = renderCustomUrlList([TEST_CUSTOM_URLS.dashboard]);

        await waitFor(() => {
          expect(container).toBeTruthy();
        });

        await waitFor(() => {
          const input = container.querySelector('input[aria-label^="Time range for custom URL"]');
          expect(input).toBeInTheDocument();
          expect(input).toHaveValue('auto');
        });

        unmount();
      });
      it('DFA job index has timestamp and Dashboard time range is 1h', async () => {
        const customUrls = [
          {
            ...TEST_CUSTOM_URLS.dashboard,
            time_range: '1h',
          },
        ];

        const { container, unmount } = renderCustomUrlList(customUrls);

        await waitFor(() => {
          expect(container).toBeTruthy();
        });

        await waitFor(() => {
          const input = container.querySelector('input[aria-label^="Time range for custom URL"]');
          expect(input).toBeInTheDocument();
          expect(input).toHaveValue('1h');
        });

        unmount();
      });
      it('DFA job index has timestamp and Discover URL has timestamp', async () => {
        // First call (for DFA job index check) - has timestamp
        mockDataViews.get.mockResolvedValueOnce({
          timeFieldName: '@timestamp',
        });

        // Second call (for Discover URL index check) - also has timestamp
        mockDataViews.get.mockResolvedValueOnce({
          timeFieldName: '@timestamp',
        });

        const { container, unmount } = renderCustomUrlList([TEST_CUSTOM_URLS.discover]);

        await waitFor(() => {
          const inputs = container.querySelectorAll(
            'input[aria-label^="Time range for custom URL"]'
          );
          expect(inputs).toHaveLength(1);
        });

        unmount();
      });
      it('DFA job index has timestamp and Other URL is not recognized', async () => {
        mockDataViews.get.mockResolvedValueOnce({
          timeFieldName: '@timestamp',
        });

        const { container, unmount } = renderCustomUrlList([TEST_CUSTOM_URLS.unknown]);

        await waitFor(() => {
          const inputs = container.querySelectorAll(
            'input[aria-label^="Time range for custom URL"]'
          );
          expect(inputs).toHaveLength(1);
        });

        unmount();
      });
      it('Discover data view ID can not be determined', async () => {
        mockParseUrlState.mockReturnValue({ _a: { index: undefined } });

        const { container, unmount } = renderCustomUrlList([TEST_CUSTOM_URLS.discover]);

        await waitFor(() => {
          expect(container).toBeTruthy();
        });

        await waitFor(() => {
          expect(
            container.querySelector('input[aria-label^="Time range for custom URL"]')
          ).toBeInTheDocument();
        });

        unmount();
      });
      it('should handle multiple custom URLs with mixed timestamp support', async () => {
        mockDataViews.get
          .mockResolvedValueOnce({ timeFieldName: '@timestamp' }) // DFA job URL has timestamp
          .mockResolvedValueOnce({ timeFieldName: '@timestamp' }) // Discover URL has timestamp
          .mockResolvedValueOnce({ timeFieldName: '@timestamp' }) // Second DFA job URL has timestamp
          .mockResolvedValueOnce({ timeFieldName: undefined }); // Second Discover URL has no timestamp

        const customUrls = [TEST_CUSTOM_URLS.discover, TEST_CUSTOM_URLS.discover];
        const { container, unmount } = renderCustomUrlList(customUrls);

        // Should render time range for first URL only
        await waitFor(() => {
          const timeRangeInputs = container.querySelectorAll(
            'input[aria-label^="Time range for custom URL"]'
          );
          expect(timeRangeInputs).toHaveLength(1);
        });

        unmount();
      });
    });
    describe('should not display time range when', () => {
      it('DFA job index does not have timestamp and Dashboards URL is selected', async () => {
        mockDataViews.get.mockResolvedValueOnce({
          timeFieldName: undefined,
        });

        const { container, unmount } = renderCustomUrlList([TEST_CUSTOM_URLS.dashboard]);

        await waitFor(() => {
          const inputs = container.querySelectorAll(
            'input[aria-label^="Time range for custom URL"]'
          );
          expect(inputs).toHaveLength(0);
        });

        unmount();
      });
      it('DFA job index has timestamp and Dashboards URL is selected and Custom time range was selected', async () => {
        mockDataViews.get.mockResolvedValue({
          timeFieldName: '@timestamp',
        });

        const customUrls = [
          {
            ...TEST_CUSTOM_URLS.dashboard,
            is_custom_time_range: true, // Custom time range selected
          },
        ];

        const { container, unmount } = renderCustomUrlList(customUrls);

        await waitFor(() => {
          expect(container).toBeTruthy();
        });

        // Wait for async checkTimeRangeVisibility to complete
        await waitFor(() => {
          const inputs = container.querySelectorAll(
            'input[aria-label^="Time range for custom URL"]'
          );
          expect(inputs).toHaveLength(0);
        });

        unmount();
      });
      it('DFA job index has timestamp and Discover URL does not have timestamp', async () => {
        // First call (for DFA job index check) - has timestamp
        mockDataViews.get.mockResolvedValueOnce({
          timeFieldName: '@timestamp',
        });

        // Second call (for Discover URL index check) - does not have timestamp
        mockDataViews.get.mockResolvedValueOnce({
          timeFieldName: undefined,
        });

        const { container, unmount } = renderCustomUrlList([TEST_CUSTOM_URLS.discover]);

        await waitFor(() => {
          const inputs = container.querySelectorAll(
            'input[aria-label^="Time range for custom URL"]'
          );
          expect(inputs).toHaveLength(0);
        });

        unmount();
      });
      it('DFA job index does not have timestamp and Discover URL has timestamp', async () => {
        mockDataViews.get.mockResolvedValueOnce({
          timeFieldName: undefined,
        });

        mockDataViews.get.mockResolvedValueOnce({
          timeFieldName: '@timestamp',
        });

        const { container, unmount } = renderCustomUrlList([TEST_CUSTOM_URLS.discover]);

        await waitFor(() => {
          const inputs = container.querySelectorAll(
            'input[aria-label^="Time range for custom URL"]'
          );
          expect(inputs).toHaveLength(0);
        });

        unmount();
      });
      it('DFA job index does not have timestamp and Discover URL does not have timestamp', async () => {
        mockDataViews.get.mockResolvedValueOnce({
          timeFieldName: undefined,
        });

        mockDataViews.get.mockResolvedValueOnce({
          timeFieldName: undefined,
        });

        const { container, unmount } = renderCustomUrlList([TEST_CUSTOM_URLS.discover]);

        await waitFor(() => {
          const inputs = container.querySelectorAll(
            'input[aria-label^="Time range for custom URL"]'
          );
          expect(inputs).toHaveLength(0);
        });

        unmount();
      });
      it('DFA job has timestamp and Discover has timefield and Custom time range was selected', async () => {
        mockDataViews.get.mockResolvedValueOnce({
          timeFieldName: '@timestamp',
        });

        mockDataViews.get.mockResolvedValueOnce({
          timeFieldName: '@timestamp',
        });

        const customUrls = [
          {
            ...TEST_CUSTOM_URLS.discover,
            is_custom_time_range: true, // Custom time range selected
          },
        ];

        const { container, unmount } = renderCustomUrlList(customUrls);

        await waitFor(() => {
          expect(container).toBeTruthy();
        });

        await waitFor(() => {
          const inputs = container.querySelectorAll(
            'input[aria-label^="Time range for custom URL"]'
          );
          expect(inputs).toHaveLength(0);
        });

        unmount();
      });
    });
  });

  describe('Anomaly Detection Job - Time Range Field Visibility', () => {
    describe('should display time range when', () => {
      it('Dashboards URL is selected', async () => {
        const { container, unmount } = renderCustomUrlList([TEST_CUSTOM_URLS.dashboard], {
          job: mockADJob,
        });

        await waitFor(() => {
          expect(container).toBeTruthy();
        });

        await waitFor(() => {
          const inputs = container.querySelectorAll(
            'input[aria-label^="Time range for custom URL"]'
          );
          expect(inputs).toHaveLength(1);
        });

        unmount();
      });

      it('Discover URL has timestamp', async () => {
        mockDataViews.get.mockResolvedValue({
          timeFieldName: '@timestamp',
        });

        const { container, unmount } = renderCustomUrlList([TEST_CUSTOM_URLS.discover], {
          job: mockADJob,
        });

        await waitFor(() => {
          expect(container).toBeTruthy();
        });

        await waitFor(() => {
          const inputs = container.querySelectorAll(
            'input[aria-label^="Time range for custom URL"]'
          );
          expect(inputs).toHaveLength(1);
        });

        unmount();
      });

      it('Other URL is not recognized', async () => {
        const { container, unmount } = renderCustomUrlList([TEST_CUSTOM_URLS.other], {
          job: mockADJob,
        });

        await waitFor(() => {
          expect(container).toBeTruthy();
        });

        await waitFor(() => {
          const inputs = container.querySelectorAll(
            'input[aria-label^="Time range for custom URL"]'
          );
          expect(inputs).toHaveLength(1);
        });

        unmount();
      });
      it('Discover data view cannot be found', async () => {
        mockDataViews.get.mockRejectedValue(new Error('Data view not found'));

        const { container, unmount } = renderCustomUrlList([TEST_CUSTOM_URLS.discover], {
          job: mockADJob,
        });

        await waitFor(() => {
          expect(mockDataViews.get).toHaveBeenCalled();
        });

        await waitFor(() => {
          expect(
            container.querySelector('input[aria-label^="Time range for custom URL"]')
          ).toBeInTheDocument();
        });

        unmount();
      });
    });
    describe('should not display time range when', () => {
      it('Discover does not have timestamp', async () => {
        mockDataViews.get.mockResolvedValue({
          timeFieldName: undefined,
        });

        const { container, unmount } = renderCustomUrlList([TEST_CUSTOM_URLS.discover], {
          job: mockADJob,
        });

        await waitFor(() => {
          const inputs = container.querySelectorAll(
            'input[aria-label^="Time range for custom URL"]'
          );
          expect(inputs).toHaveLength(0);
        });

        unmount();
      });
    });
  });
});

describe('extractDataViewIdFromCustomUrl', () => {
  describe('dashboard URLs', () => {
    it('should return data view ID for destination index when not a partial job', () => {
      const result = extractDataViewIdFromCustomUrl(
        mockDFAJob,
        TEST_CUSTOM_URLS.dashboard,
        mockDataViewListItems,
        false // not partial
      );

      expect(result).toBe(mockDFAJob.dest.index);
    });
    it('should return data view ID for source index when a partial job', () => {
      const result = extractDataViewIdFromCustomUrl(
        mockDFAJob,
        TEST_CUSTOM_URLS.dashboard,
        mockDataViewListItems,
        true // partial job
      );

      expect(result).toBe(mockDFAJob.source.index[0]);
    });

    it('should return data view ID for source index when partial job', () => {
      const result = extractDataViewIdFromCustomUrl(
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

      const result = extractDataViewIdFromCustomUrl(
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

      const result = extractDataViewIdFromCustomUrl(
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

      const result = extractDataViewIdFromCustomUrl(
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

      const result = extractDataViewIdFromCustomUrl(
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

      const result = extractDataViewIdFromCustomUrl(
        mockDFAJob,
        malformedDiscoverUrl,
        mockDataViewListItems,
        false
      );

      expect(result).toBeUndefined();
    });

    it('should return undefined when _a.index is not present in URL state', () => {
      mockParseUrlState.mockReturnValue({
        _a: { columns: [] },
      });

      const result = extractDataViewIdFromCustomUrl(
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
      const result = extractDataViewIdFromCustomUrl(
        mockDFAJob,
        TEST_CUSTOM_URLS.dashboard,
        undefined, // no data view list items
        false
      );

      expect(result).toBeUndefined();
    });

    it('should handle empty dataViewListItems array', () => {
      const result = extractDataViewIdFromCustomUrl(
        mockDFAJob,
        TEST_CUSTOM_URLS.dashboard,
        [], // empty array
        false
      );

      expect(result).toBeUndefined();
    });
  });
});
