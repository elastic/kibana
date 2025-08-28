/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Job } from '../../../../../common/types/anomaly_detection_jobs';

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

const TEST_CUSTOM_URLS = [
  {
    url_name: 'Show data',
    time_range: 'auto',
    url_value:
      "discover#/?_g=(time:(from:'$earliest$',mode:absolute,to:'$latest$'))&_a=" +
      '(index:e532ba80-b76f-11e8-a9dc-37914a458883,query:(language:lucene,query:\'airline:"$airline$"\'))',
  },
  {
    url_name: 'Show dashboard',
    time_range: '1h',
    url_value:
      'dashboards#/view/52ea8840-bbef-11e8-a04d-b1701b2b977e?_g=' +
      "(time:(from:'$earliest$',mode:absolute,to:'$latest$'))&" +
      '_a=(filters:!(),query:(language:lucene,query:\'airline:"$airline$"\'))',
  },
  {
    url_name: 'Show airline',
    time_range: 'auto',
    url_value: 'http://airlinecodes.info/airline-code-$airline$',
  },
];

const TEST_URLS = {
  dashboard: {
    url_name: 'Test Dashboard',
    url_value: '/app/dashboards#/view/dashboard-id',
    time_range: 'auto',
  } as MlKibanaUrlConfig,
  discover: {
    url_name: 'Test Discover',
    url_value: '/app/discover#/',
    time_range: 'auto',
  } as MlKibanaUrlConfig,
  external: {
    url_name: 'External Link',
    url_value: 'https://example.com',
    time_range: 'auto',
  } as MlKibanaUrlConfig,
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

function prepareTest(setCustomUrlsFn: jest.Mock) {
  const customUrls = TEST_CUSTOM_URLS;

  const props: CustomUrlListProps = {
    job: {
      job_id: 'test',
      analysis_config: {},
      // Add minimal DFA properties to prevent errors in findDataViewId
      source: { index: ['test-index'] },
      dest: { index: 'test-dest' },
    } as unknown as Job,
    customUrls,
    onChange: setCustomUrlsFn,
    dataViewListItems: [],
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
    const { container, unmount } = prepareTest(setCustomUrls);

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
    const { getByTestId, unmount } = prepareTest(setCustomUrls);
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

describe('findDataViewId', () => {
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
    analyzed_fields: {
      includes: ['field1', 'field2'],
      excludes: [],
    },
    model_memory_limit: '100mb',
    create_time: Date.now(),
    version: '8.0.0',
  };

  describe('dashboard URLs', () => {
    it('should return data view ID for destination index when not a partial job', () => {
      const result = findDataViewId(
        mockDFAJob,
        TEST_URLS.dashboard,
        mockDataViewListItems,
        false // not partial
      );

      expect(result).toBe('dest-index');
    });

    it('should return data view ID for source index when partial job', () => {
      const result = findDataViewId(
        mockDFAJob,
        TEST_URLS.dashboard,
        mockDataViewListItems,
        true // partial job
      );

      expect(result).toBe('source-index');
    });

    it('should fallback to source index when destination index not found', () => {
      const jobWithMissingDest = {
        ...mockDFAJob,
        dest: { index: 'non-existent-dest' },
      };

      const result = findDataViewId(
        jobWithMissingDest,
        TEST_URLS.dashboard,
        mockDataViewListItems,
        false
      );

      expect(result).toBe('source-index');
    });

    it('should handle array source indexes', () => {
      const jobWithArraySource = {
        ...mockDFAJob,
        source: { index: ['source-index', 'other-index'] },
      };

      const result = findDataViewId(
        jobWithArraySource,
        TEST_URLS.dashboard,
        mockDataViewListItems,
        true
      );

      expect(result).toBe('source-index,other-index');
    });

    it('should return undefined when no matching data view found', () => {
      const jobWithUnknownIndexes = {
        ...mockDFAJob,
        source: { index: 'unknown-source' },
        dest: { index: 'unknown-dest' },
      };

      const result2 = findDataViewId(
        jobWithUnknownIndexes,
        TEST_URLS.dashboard,
        mockDataViewListItems,
        false
      );

      expect(result2).toBeUndefined();
    });
  });

  describe('discover URLs', () => {
    it('should extract data view ID from URL state', () => {
      mockParseUrlState.mockReturnValue({
        _a: { index: 'logs-*' },
      });

      const result = findDataViewId(mockDFAJob, TEST_URLS.discover, mockDataViewListItems, false);

      expect(parseUrlState).toHaveBeenCalledWith('/app/discover#/');
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

      const result = findDataViewId(mockDFAJob, TEST_URLS.discover, mockDataViewListItems, false);

      expect(result).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should handle missing dataViewListItems', () => {
      const result = findDataViewId(
        mockDFAJob,
        TEST_URLS.dashboard,
        undefined, // no data view list items
        false
      );

      expect(result).toBeUndefined();
    });

    it('should handle empty dataViewListItems array', () => {
      const result = findDataViewId(
        mockDFAJob,
        TEST_URLS.dashboard,
        [], // empty array
        false
      );

      expect(result).toBeUndefined();
    });
  });
});
