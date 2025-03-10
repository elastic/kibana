/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import { loadFieldStats } from '@kbn/unified-field-list/src/services/field_stats';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InnerFieldItem, FieldItemIndexPatternFieldProps } from './field_item';
import { coreMock } from '@kbn/core/public/mocks';
import { fieldFormatsServiceMock } from '@kbn/field-formats-plugin/public/mocks';
import { IndexPattern } from '../../types';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { documentField } from '../form_based/document_field';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';

jest.mock('@kbn/unified-field-list/src/services/field_stats', () => ({
  loadFieldStats: jest.fn().mockResolvedValue({}),
}));

const corePluginMock = coreMock.createStart();

const indexPattern = {
  id: '1',
  title: 'my-fake-index-pattern',
  timeFieldName: 'timestamp',
  fields: [
    {
      name: 'timestamp',
      displayName: 'timestamp',
      type: 'date',
      aggregatable: true,
      searchable: true,
    },
    {
      name: 'bytes',
      displayName: 'bytes',
      type: 'number',
      aggregatable: true,
      searchable: true,
    },
    {
      name: 'memory',
      displayName: 'memory',
      type: 'number',
      aggregatable: true,
      searchable: true,
    },
    {
      name: 'unsupported',
      displayName: 'unsupported',
      type: 'geo',
      aggregatable: true,
      searchable: true,
    },
    {
      name: 'source',
      displayName: 'source',
      type: 'string',
      aggregatable: true,
      searchable: true,
    },
    {
      name: 'ip_range',
      displayName: 'ip_range',
      type: 'ip_range',
      aggregatable: true,
      searchable: true,
    },
    {
      name: 'geo.coordinates',
      displayName: 'geo.coordinates',
      type: 'geo_shape',
      aggregatable: true,
      searchable: true,
    },
    documentField,
  ],
  isTimeBased: jest.fn(),
} as unknown as IndexPattern;

const dataView = {
  ...indexPattern,
  getFormatterForField: jest.fn(() => ({
    convert: jest.fn((s: unknown) => JSON.stringify(s)),
  })),
} as unknown as DataView;

const dataViewsMock = dataViewPluginMocks.createStartContract();

const mockedServices = {
  data: dataPluginMock.createStartContract(),
  dataViews: {
    ...dataViewsMock,
    get: jest.fn().mockResolvedValue(dataView),
  },
  fieldFormats: fieldFormatsServiceMock.createStartContract(),
  charts: chartPluginMock.createSetupContract(),
  uiActions: uiActionsPluginMock.createStartContract(),
  uiSettings: coreMock.createStart().uiSettings,
  share: {
    url: {
      locators: {
        get: jest.fn().mockReturnValue({
          getRedirectUrl: jest.fn(() => 'discover_url'),
        }),
      },
    },
  },
  application: {
    capabilities: {
      discover_v2: { save: true, show: true },
    },
  },
  core: corePluginMock,
};

const defaultProps: FieldItemIndexPatternFieldProps = {
  indexPattern,
  highlight: '',
  dateRange: {
    fromDate: 'now-7d',
    toDate: 'now',
  },
  query: { query: '', language: 'lucene' },
  filters: [],
  field: {
    name: 'bytes',
    displayName: 'bytes',
    type: 'number',
    aggregatable: true,
    searchable: true,
  },
  exists: true,
  groupIndex: 0,
  itemIndex: 0,
  dropOntoWorkspace: () => {},
  hasSuggestionForField: () => false,
};

describe('Lens Field Item', () => {
  beforeEach(() => {
    (loadFieldStats as jest.Mock).mockClear();
  });

  const renderFieldItem = (props?: Partial<FieldItemIndexPatternFieldProps>) => {
    const Wrapper: React.FC<{
      children: React.ReactNode;
    }> = ({ children }) => {
      return (
        <KibanaRenderContextProvider {...mockedServices.core}>
          <KibanaContextProvider services={mockedServices}>
            <button>close the euiPopover</button>
            {children}
          </KibanaContextProvider>
        </KibanaRenderContextProvider>
      );
    };

    const rtlRender = render(<InnerFieldItem {...defaultProps} {...props} />, { wrapper: Wrapper });
    return { ...rtlRender };
  };

  const clickField = async (fieldname: string) => {
    await userEvent.click(screen.getByTestId(`field-${fieldname}-showDetails`));
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
  };

  const getFieldNode = (index = 0) => {
    return screen.getAllByTestId('lnsFieldListPanelField')[index];
  };

  const queryProgressBar = () => screen.queryByRole('progressbar', { name: 'Loading' });

  const queryFieldStats = () => screen.queryByTestId('unifiedFieldStats-buttonGroup');

  it('should display displayName of a field', async () => {
    renderFieldItem();
    expect(getFieldNode()).toHaveTextContent('bytes');
  });

  it('should show gauge icon for gauge fields', async () => {
    renderFieldItem({ field: { ...defaultProps.field, timeSeriesMetric: 'gauge' } });
    expect(screen.getByText('Gauge metric')).toBeInTheDocument();
  });

  it('should render edit field button if callback is set', async () => {
    const editFieldSpy = jest.fn();
    renderFieldItem({ editField: editFieldSpy, hideDetails: true });
    await clickField('bytes');
    fireEvent.click(screen.getByRole('button', { name: 'Edit data view field' }));
    expect(editFieldSpy).toHaveBeenCalledWith('bytes');
  });

  it('should not render edit field button for document field', async () => {
    renderFieldItem({ field: documentField });
    await clickField(documentField.name);
    expect(screen.queryByRole('button', { name: 'Edit data view field' })).not.toBeInTheDocument();
  });

  it('should pass add filter callback and pass result to filter manager', async () => {
    (loadFieldStats as jest.Mock).mockResolvedValueOnce({
      totalDocuments: 4633,
      sampledDocuments: 4633,
      sampledValues: 4633,
      topValues: {
        buckets: [{ count: 147, key: 'abc' }],
      },
    });

    const field = {
      name: 'test',
      displayName: 'test',
      type: 'string',
      aggregatable: true,
      searchable: true,
      filterable: true,
    };
    renderFieldItem({ field });
    await clickField('test');
    await userEvent.click(screen.getByRole('button', { name: 'Filter for test: ""abc""' }));

    expect(mockedServices.data.query.filterManager.addFilters).toHaveBeenCalledWith([
      expect.objectContaining({ query: { match_phrase: { test: 'abc' } } }),
    ]);
  });

  it('should request field stats every time the button is clicked', async () => {
    const dataViewField = new DataViewField(defaultProps.field);
    (loadFieldStats as jest.Mock).mockResolvedValueOnce({
      totalDocuments: 4633,
      sampledDocuments: 4633,
      sampledValues: 4633,
      histogram: {
        buckets: [{ count: 705, key: 0 }],
      },
      topValues: {
        buckets: [{ count: 147, key: 0 }],
      },
    });

    const { rerender } = renderFieldItem();

    await clickField('bytes');

    expect(loadFieldStats).toHaveBeenCalledWith({
      abortController: new AbortController(),
      services: { data: mockedServices.data },
      dataView,
      dslQuery: {
        bool: {
          must: [],
          filter: [],
          should: [],
          must_not: [],
        },
      },
      fromDate: 'now-7d',
      toDate: 'now',
      field: dataViewField,
    });
    expect(queryFieldStats()).toBeInTheDocument();
    // closing the popover by clicking the button again
    await clickField('bytes');

    expect(loadFieldStats).toHaveBeenCalledTimes(1);
    expect(queryFieldStats()).not.toBeInTheDocument();

    const newContextProps: Pick<
      FieldItemIndexPatternFieldProps,
      'dateRange' | 'query' | 'filters'
    > = {
      dateRange: {
        fromDate: 'now-14d',
        toDate: 'now-7d',
      },
      query: { query: 'geo.src : "US"', language: 'kuery' },
      filters: [
        {
          query: { match: { phrase: { 'geo.dest': 'US' } } },
        },
      ] as unknown as FieldItemIndexPatternFieldProps['filters'],
    };
    rerender(<InnerFieldItem {...defaultProps} {...newContextProps} />);
    await clickField('bytes');

    expect(loadFieldStats).toHaveBeenCalledTimes(2);
    expect(loadFieldStats).toHaveBeenLastCalledWith({
      abortController: new AbortController(),
      services: { data: mockedServices.data },
      dataView,
      dslQuery: {
        bool: {
          must: [],
          filter: [
            {
              bool: {
                should: [{ match_phrase: { 'geo.src': 'US' } }],
                minimum_should_match: 1,
              },
            },
            {
              match: { phrase: { 'geo.dest': 'US' } },
            },
          ],
          should: [],
          must_not: [],
        },
      },
      fromDate: 'now-14d',
      toDate: 'now-7d',
      field: dataViewField,
    });
  });

  it('should not request field stats for document field', async () => {
    renderFieldItem({ field: documentField });
    await clickField(documentField.name);
    expect(loadFieldStats).toHaveBeenCalled();
    expect(queryProgressBar()).not.toBeInTheDocument();
    expect(screen.getByText('Analysis is not available for this field.')).toBeInTheDocument();
  });

  it('should not request field stats for range fields', async () => {
    renderFieldItem({
      field: {
        name: 'ip_range',
        displayName: 'ip_range',
        type: 'ip_range',
        aggregatable: true,
        searchable: true,
      },
    });

    await clickField('ip_range');
    expect(loadFieldStats).toHaveBeenCalled();
    expect(queryProgressBar()).not.toBeInTheDocument();
    expect(screen.getByText('Analysis is not available for this field.')).toBeInTheDocument();
  });

  it('should request examples for geo fields and render Visualize button', async () => {
    renderFieldItem({
      field: {
        name: 'geo.coordinates',
        displayName: 'geo.coordinates',
        type: 'geo_shape',
        aggregatable: true,
        searchable: true,
      },
    });
    await clickField('geo.coordinates');
    expect(loadFieldStats).toHaveBeenCalled();

    expect(queryProgressBar()).not.toBeInTheDocument();
    expect(screen.getByTestId('lnsFieldListPanel-missingFieldStats')).toHaveTextContent(
      'Lens is unable to create visualizations with this field because it does not contain data. To create a visualization, drag and drop a different field.'
    );
  });

  it('should display Explore in discover button', async () => {
    renderFieldItem();
    await clickField('bytes');
    expect(screen.getByTestId('lnsFieldListPanel-exploreInDiscover-bytes')).toBeInTheDocument();
  });

  it('should not display Explore in discover button for a geo_point field', async () => {
    renderFieldItem({
      field: {
        name: 'geo_point',
        displayName: 'geo_point',
        type: 'geo_point',
        aggregatable: true,
        searchable: true,
      },
    });
    await clickField('geo_point');
    expect(
      screen.queryByTestId('lnsFieldListPanel-exploreInDiscover-geo_point')
    ).not.toBeInTheDocument();
  });

  it('should not display Explore in discover button if discover_v2 capabilities show is false', async () => {
    const services = {
      ...mockedServices,
      application: {
        capabilities: {
          discover_v2: { save: false, show: false },
        },
      },
    };

    render(
      <KibanaContextProvider services={services}>
        <InnerFieldItem {...defaultProps} />
      </KibanaContextProvider>
    );
    await clickField('bytes');
    expect(
      screen.queryByTestId('lnsFieldListPanel-exploreInDiscover-bytes')
    ).not.toBeInTheDocument();
  });
});
