/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { DataView } from '@kbn/data-views-plugin/common';
import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';
import type { DataTableRecord } from '@kbn/discover-utils';
import { useAlertingEpisodeSourceDataView } from '@kbn/alerting-v2-episodes-ui/hooks/use_alerting_episode_source_data_view';
import {
  createMockServices,
  createQueryClientWrapper,
  createTestQueryClient,
} from '@kbn/alerting-v2-episodes-ui/hooks/test_utils';
import { EpisodeTableDocView } from './episode_table_doc_view';

jest.mock('@kbn/alerting-v2-episodes-ui/hooks/use_alerting_episode_source_data_view');

const mockUseSourceDataView = jest.mocked(useAlertingEpisodeSourceDataView);
const mockServices = createMockServices();
const mockHttpGet = jest.mocked(mockServices.http.get);
const mockRenderTable = jest.fn(() => <div data-test-subj="tableStub" />);

const mockDiscoverDataView = new DataView({
  spec: { id: 'esql', title: 'esql', fields: {} },
  fieldFormats: fieldFormatsMock,
});
const mockSourceDataView = new DataView({
  spec: {
    id: 'source',
    title: 'source',
    fields: {
      'host.name': {
        name: 'host.name',
        type: 'string',
        esTypes: ['keyword'],
        searchable: true,
        aggregatable: true,
      },
    },
  },
  fieldFormats: fieldFormatsMock,
});

const makeHit = (fields: Record<string, unknown>): DataTableRecord => ({
  id: 'ep-1',
  raw: {},
  flattened: { 'episode.id': 'ep-1', episode_data: '{"host":{"name":"web-1"}}', ...fields },
});

const renderDocView = (hit: DataTableRecord) =>
  render(
    <EpisodeTableDocView
      renderTable={mockRenderTable}
      renderProps={{ hit, dataView: mockDiscoverDataView }}
      services={mockServices}
    />,
    { wrapper: createQueryClientWrapper(createTestQueryClient()) }
  );

const getRenderedProps = () =>
  (mockRenderTable.mock.calls.at(-1) as unknown[])[0] as {
    hit: DataTableRecord;
    dataView: DataView;
  };

describe('EpisodeTableDocView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSourceDataView.mockReturnValue({ loading: false, value: undefined });
  });

  it('renders the episode data as one row per value', () => {
    renderDocView(makeHit({}));

    expect(getRenderedProps().hit.flattened).toEqual({
      'episode.id': 'ep-1',
      'data.host.name': 'web-1',
    });
  });

  it('keeps the Discover data view when the row has no rule', () => {
    renderDocView(makeHit({}));

    expect(getRenderedProps().dataView).toBe(mockDiscoverDataView);
    expect(mockHttpGet).not.toHaveBeenCalled();
  });

  it('types the data fields with the data view of the rule query', async () => {
    mockHttpGet.mockResolvedValue({ query: { base: 'FROM logs-*' } });
    mockUseSourceDataView.mockImplementation(({ query }) =>
      query ? { loading: false, value: mockSourceDataView } : { loading: false, value: undefined }
    );

    renderDocView(makeHit({ 'rule.id': 'rule-1' }));

    await waitFor(() =>
      expect(getRenderedProps().dataView.fields.getByName('data.host.name')?.esTypes).toEqual([
        'keyword',
      ])
    );
    expect(mockUseSourceDataView).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'FROM logs-*' })
    );
  });

  it('waits for the rule before rendering the table', () => {
    mockHttpGet.mockReturnValue(new Promise(() => {}));

    renderDocView(makeHit({ 'rule.id': 'rule-1' }));

    expect(screen.queryByTestId('tableStub')).not.toBeInTheDocument();
    expect(mockRenderTable).not.toHaveBeenCalled();
  });
});
