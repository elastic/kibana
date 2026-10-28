/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('./esql_query_editor', () => ({
  EsqlQueryEditor: ({
    esqlQuery,
    onEsqlQueryChange,
    onFetchData,
  }: {
    esqlQuery: string;
    onEsqlQueryChange: (q: string) => void;
    onFetchData: () => void;
  }) => (
    <div>
      <span data-test-subj="mockQueryText">{esqlQuery}</span>
      <button onClick={() => onEsqlQueryChange('FROM edited')}>edit</button>
      <button onClick={onFetchData}>fetch</button>
    </div>
  ),
}));

jest.mock('../services', () => ({
  getServices: () => ({ core: { chrome: undefined } }),
}));

import { EsqlDataSection } from './esql_data_section';
import type { EsqlDataSectionProps } from './esql_data_section';

const draft = (id: number, text: string) => ({
  id,
  text,
  isDataLoading: false,
  esqlData: null,
  esqlDataError: null,
});

const defaultProps: EsqlDataSectionProps = {
  esqlQuery: 'FROM main',
  onEsqlQueryChange: jest.fn(),
  isDataLoading: false,
  esqlData: null,
  esqlDataError: null,
  onFetchData: jest.fn(),
  renderError: null,
  additionalQueries: [],
  canAddQuery: true,
  onAddQuery: jest.fn(),
  onRemoveQuery: jest.fn(),
  onQueryTextChange: jest.fn(),
  onFetchQueryData: jest.fn(),
};

const twoExtraQueries = [draft(4, 'FROM a'), draft(9, 'FROM b')];

// The tabs are named by their position, which Jest's generated ids make identical, so pick them by id.
const tabTestSubj = (id: string) => `unifiedTabs_selectTabBtn_${id}`;

describe('EsqlDataSection', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('with a single query', () => {
    it('shows the editor and no tabs', () => {
      render(<EsqlDataSection {...defaultProps} />);
      expect(screen.getByText('Data source (ES|QL)')).toBeInTheDocument();
      expect(screen.getByTestId('mockQueryText')).toHaveTextContent('FROM main');
      expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    });

    it('adds a query', async () => {
      render(<EsqlDataSection {...defaultProps} />);
      await userEvent.click(screen.getByTestId('customContentAddQueryButton'));
      expect(defaultProps.onAddQuery).toHaveBeenCalledTimes(1);
    });

    it('disables adding when a query cannot be added', () => {
      render(<EsqlDataSection {...defaultProps} canAddQuery={false} />);
      expect(screen.getByTestId('customContentAddQueryButton')).toBeDisabled();
    });
  });

  describe('with several queries', () => {
    const renderSeveral = (props: Partial<EsqlDataSectionProps> = {}) =>
      render(<EsqlDataSection {...defaultProps} additionalQueries={twoExtraQueries} {...props} />);

    it('shows a tab per query and starts on the first', () => {
      renderSeveral();
      expect(screen.getByText('Data sources (ES|QL)')).toBeInTheDocument();
      expect(screen.getAllByRole('tab')).toHaveLength(3);
      expect(screen.getByTestId(tabTestSubj('main'))).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByTestId('mockQueryText')).toHaveTextContent('FROM main');
    });

    it('keeps the add button below the tab bar', async () => {
      renderSeveral();
      await userEvent.click(screen.getByTestId('customContentAddQueryButton'));
      expect(defaultProps.onAddQuery).toHaveBeenCalledTimes(1);
    });

    it('names the template variable of the selected query', async () => {
      renderSeveral();
      expect(screen.getByTestId('customContentQueryVariable')).toHaveTextContent(/^rows$/);

      await userEvent.click(screen.getByTestId(tabTestSubj('query-4')));
      expect(screen.getByTestId('customContentQueryVariable')).toHaveTextContent(
        /^queries\[1\]\.rows$/
      );
      expect(screen.getByTestId('mockQueryText')).toHaveTextContent('FROM a');

      await userEvent.click(screen.getByTestId(tabTestSubj('query-9')));
      expect(screen.getByTestId('customContentQueryVariable')).toHaveTextContent(
        /^queries\[2\]\.rows$/
      );
    });

    it('has no actions menu on the first query', () => {
      renderSeveral();
      expect(screen.queryByTestId('customContentQueryActions-1')).not.toBeInTheDocument();
      expect(screen.getByTestId('customContentQueryActions-2')).toBeInTheDocument();
      expect(screen.getByTestId('customContentQueryActions-3')).toBeInTheDocument();
    });

    it('removes a query from its tab menu by its id, not its position', async () => {
      renderSeveral();
      await userEvent.click(screen.getByTestId('customContentQueryActions-3'));
      await userEvent.click(screen.getByTestId('customContentRemoveQuery-3'));
      expect(defaultProps.onRemoveQuery).toHaveBeenCalledWith(9);
    });

    it('does not show the actions tooltip over the open menu', async () => {
      renderSeveral();
      const button = screen.getByTestId('customContentQueryActions-2');

      await userEvent.hover(button);
      expect(await screen.findByRole('tooltip')).toHaveTextContent('Actions for query 2');

      await userEvent.click(button);
      expect(screen.getByTestId('customContentRemoveQuery-2')).toBeInTheDocument();
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    it('passes the id of a query, not its position, to the callbacks', async () => {
      renderSeveral();
      await userEvent.click(screen.getByTestId(tabTestSubj('query-9')));

      await userEvent.click(screen.getByRole('button', { name: 'edit' }));
      expect(defaultProps.onQueryTextChange).toHaveBeenCalledWith(9, 'FROM edited');

      await userEvent.click(screen.getByRole('button', { name: 'fetch' }));
      expect(defaultProps.onFetchQueryData).toHaveBeenCalledWith(9);
    });

    it('goes back to the first query when the selected one is removed', async () => {
      const { rerender } = renderSeveral();
      await userEvent.click(screen.getByTestId(tabTestSubj('query-9')));

      rerender(<EsqlDataSection {...defaultProps} additionalQueries={[draft(4, 'FROM a')]} />);

      expect(screen.getByTestId('mockQueryText')).toHaveTextContent('FROM main');
    });

    it('selects a query that was just added', () => {
      const { rerender } = renderSeveral({ additionalQueries: [draft(4, 'FROM a')] });
      rerender(<EsqlDataSection {...defaultProps} additionalQueries={twoExtraQueries} />);

      expect(screen.getByTestId(tabTestSubj('query-9'))).toHaveAttribute('aria-selected', 'true');
    });

    it('drops back to a single editor with no tabs when only the first query is left', () => {
      const { rerender } = renderSeveral();
      rerender(<EsqlDataSection {...defaultProps} additionalQueries={[]} />);
      expect(screen.queryByRole('tab')).not.toBeInTheDocument();
      expect(screen.getByTestId('mockQueryText')).toHaveTextContent('FROM main');
    });

    it('shows a preview error above the tabs whichever query is selected', async () => {
      renderSeveral({ renderError: 'Query 3 failed: bad index' });
      await userEvent.click(screen.getByTestId(tabTestSubj('query-4')));
      expect(screen.getByTestId('customContentRenderError')).toHaveTextContent(
        'Query 3 failed: bad index'
      );
    });
  });
});
