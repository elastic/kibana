/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { EpisodeRuleCellWithFetch } from './rule_cell_with_fetch';

const mockHttp = httpServiceMock.createStartContract();

const makeRow = (fields: Record<string, unknown>) => ({ id: '0', raw: {}, flattened: fields });

const mockCellProps = {
  columnId: 'rule.id',
  dataView: {} as never,
  fieldFormats: {} as never,
  closePopover: jest.fn(),
  setCellProps: jest.fn(),
  rowIndex: 0,
  colIndex: 0,
  isDetails: false,
  isExpanded: false,
  isExpandable: false,
  rowHeight: 2,
  http: mockHttp,
  getRuleDetailsHref: () => undefined,
};

const renderCells = (rows: Array<ReturnType<typeof makeRow>>) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        {rows.map((row, index) => (
          <EpisodeRuleCellWithFetch key={index} {...mockCellProps} row={row} />
        ))}
      </QueryClientProvider>
    </I18nProvider>
  );
};

describe('EpisodeRuleCellWithFetch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the name of the fetched rule', async () => {
    mockHttp.get.mockResolvedValue({ metadata: { name: 'My rule' }, query: { base: 'FROM x' } });

    renderCells([makeRow({ 'rule.id': 'rule-1' })]);

    expect(await screen.findByText('My rule')).toBeInTheDocument();
    expect(mockHttp.get).toHaveBeenCalledWith(
      expect.stringContaining('rule-1'),
      expect.objectContaining({ signal: expect.anything() })
    );
  });

  it('fetches a rule once for all the rows that share it', async () => {
    mockHttp.get.mockResolvedValue({
      metadata: { name: 'Shared rule' },
      query: { base: 'FROM x' },
    });

    renderCells([makeRow({ 'rule.id': 'rule-1' }), makeRow({ 'rule.id': 'rule-1' })]);

    expect(await screen.findAllByText('Shared rule')).toHaveLength(2);
    expect(mockHttp.get).toHaveBeenCalledTimes(1);
  });

  it('renders a skeleton while the rule is loading', async () => {
    mockHttp.get.mockReturnValue(new Promise(() => {}));

    renderCells([makeRow({ 'rule.id': 'rule-1' })]);

    expect(await screen.findByRole('progressbar')).toBeInTheDocument();
  });

  it('does not fetch when the row has no rule id', () => {
    renderCells([makeRow({})]);

    expect(mockHttp.get).not.toHaveBeenCalled();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
});
