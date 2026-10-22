/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CasesSource, StateDeclaration } from '@kbn/custom-app-common';
import { DataSourceField } from './data_source_field';

jest.mock('@kbn/esql/public', () => jest.requireActual('./esql_editor.mock'));

interface Data {
  query?: string;
  source?: CasesSource;
}

const STATE: Record<string, StateDeclaration> = {
  status: { type: 'string', default: '' },
  q: { type: 'string', default: '' },
};

/** Holds the data the way the editor does, and reports the latest to the test. */
const setup = (initial: Data, { canCount = false } = {}) => {
  const onChange = jest.fn();
  const Host = () => {
    const [data, setData] = useState<Data>(initial);
    return (
      <DataSourceField
        query={data.query}
        source={data.source}
        state={STATE}
        canCount={canCount}
        onChange={(change) => {
          const next = { ...data, ...change };
          setData(next);
          onChange(next);
        }}
      />
    );
  };
  render(<Host />);
  return onChange;
};

const cases = (more: Partial<CasesSource> = {}): Data => ({ source: { type: 'cases', ...more } });

describe('where a component gets its data', () => {
  describe('from a query', () => {
    it('shows the query to edit', () => {
      setup({ query: 'FROM logs' });

      expect(screen.getByLabelText('ES|QL query editor')).toHaveValue('FROM logs');
      expect(screen.getByLabelText('Data from')).toHaveValue('esql');
    });

    it('edits the query, and nothing else', async () => {
      const onChange = setup({ query: 'FROM logs' });

      await userEvent.type(screen.getByLabelText('ES|QL query editor'), '!');

      expect(onChange).toHaveBeenLastCalledWith({ query: 'FROM logs!' });
    });

    it('changes to cases, which are then not a query', async () => {
      const onChange = setup({ query: 'FROM logs' });

      await userEvent.selectOptions(screen.getByLabelText('Data from'), 'cases');

      expect(onChange).toHaveBeenLastCalledWith({ query: undefined, source: { type: 'cases' } });
      expect(screen.queryByLabelText('ES|QL query editor')).not.toBeInTheDocument();
    });
  });

  describe('from cases', () => {
    it('changes back to a query, a simple one that runs anywhere, and drops the source', async () => {
      const onChange = setup(cases());

      await userEvent.selectOptions(screen.getByLabelText('Data from'), 'esql');

      expect(onChange).toHaveBeenLastCalledWith({ query: 'ROW value = 1', source: undefined });
      expect(screen.getByLabelText('ES|QL query editor')).toBeInTheDocument();
    });

    it('starts with every filter off, saying so, and no query to edit', () => {
      setup(cases());

      expect(screen.queryByLabelText('ES|QL query editor')).not.toBeInTheDocument();
      ['Status', 'Severity', 'Search', 'Tag'].forEach((label) =>
        expect(screen.getByLabelText(label)).toHaveValue('any')
      );
    });

    describe('a filter', () => {
      it('takes a fixed value from the ones there are, for the status', async () => {
        const onChange = setup(cases());

        await userEvent.selectOptions(screen.getByLabelText('Status'), 'value');
        expect(onChange).toHaveBeenLastCalledWith({ source: { type: 'cases', status: 'open' } });

        await userEvent.selectOptions(screen.getByLabelText('Status is'), 'in-progress');
        expect(onChange).toHaveBeenLastCalledWith({
          source: { type: 'cases', status: 'in-progress' },
        });
      });

      it('takes a fixed value from the ones there are, for the severity', async () => {
        const onChange = setup(cases());

        await userEvent.selectOptions(screen.getByLabelText('Severity'), 'value');
        await userEvent.selectOptions(screen.getByLabelText('Severity is'), 'critical');

        expect(onChange).toHaveBeenLastCalledWith({
          source: { type: 'cases', severity: 'critical' },
        });
      });

      it('takes any text for a search, and for a tag', async () => {
        const onChange = setup(cases());

        await userEvent.selectOptions(screen.getByLabelText('Search'), 'value');
        await userEvent.type(screen.getByLabelText('Search is'), 'v');
        expect(onChange).toHaveBeenLastCalledWith({ source: { type: 'cases', search: 'v' } });

        await userEvent.selectOptions(screen.getByLabelText('Tag'), 'value');
        await userEvent.type(screen.getByLabelText('Tag is'), 't');
        expect(onChange).toHaveBeenLastCalledWith({
          source: { type: 'cases', search: 'v', tag: 't' },
        });
      });

      it('follows a value of the app instead, chosen from those the app has', async () => {
        const onChange = setup(cases());

        await userEvent.selectOptions(screen.getByLabelText('Status'), 'state');
        expect(onChange).toHaveBeenLastCalledWith({
          source: { type: 'cases', status: { fromState: 'status' } },
        });

        await userEvent.selectOptions(screen.getByLabelText('Status follows'), 'q');
        expect(onChange).toHaveBeenLastCalledWith({
          source: { type: 'cases', status: { fromState: 'q' } },
        });
      });

      it('can go back to any, which leaves nothing to filter by', async () => {
        const onChange = setup(cases({ status: 'closed' }));

        await userEvent.selectOptions(screen.getByLabelText('Status'), 'any');

        expect(onChange).toHaveBeenLastCalledWith({
          source: { type: 'cases', status: undefined },
        });
      });

      it('shows the filter that is set, as the kind it is', () => {
        setup(cases({ status: { fromState: 'status' }, severity: 'high', tag: '' }));

        expect(screen.getByLabelText('Status')).toHaveValue('state');
        expect(screen.getByLabelText('Status follows')).toHaveValue('status');
        expect(screen.getByLabelText('Severity')).toHaveValue('value');
        expect(screen.getByLabelText('Severity is')).toHaveValue('high');
        // An empty value is no filter, whichever way it was written.
        expect(screen.getByLabelText('Tag')).toHaveValue('any');
      });
    });

    describe('the order and the size', () => {
      it('sorts by when it was last updated, newest first, until it is told otherwise', () => {
        setup(cases());

        expect(screen.getByLabelText('Sort by')).toHaveValue('updated_at');
        expect(screen.getByLabelText('Order')).toHaveValue('desc');
      });

      it('sorts by another field, and in another order', async () => {
        const onChange = setup(cases());

        await userEvent.selectOptions(screen.getByLabelText('Sort by'), 'severity');
        expect(onChange).toHaveBeenLastCalledWith({
          source: { type: 'cases', sort: { field: 'severity', order: 'desc' } },
        });

        await userEvent.selectOptions(screen.getByLabelText('Order'), 'asc');
        expect(onChange).toHaveBeenLastCalledWith({
          source: { type: 'cases', sort: { field: 'severity', order: 'asc' } },
        });
      });

      it('says how many it shows at most, fifty until it is told otherwise', async () => {
        const onChange = setup(cases());
        const limit = screen.getByRole('spinbutton', { name: 'How many at most' });
        // Empty, with the fifty it falls back to as a hint, so that it can be cleared and retyped.
        expect(limit).toHaveValue(null);
        expect(limit).toHaveAttribute('placeholder', '50');

        await userEvent.clear(limit);
        await userEvent.type(limit, '7');

        expect(onChange).toHaveBeenLastCalledWith({ source: { type: 'cases', limit: 7 } });
      });
    });

    describe('the period of the app', () => {
      it('is not what the cases are limited to, unless it is asked for', async () => {
        const onChange = setup(cases());
        const toggle = screen.getByRole('switch', {
          name: 'Only the cases created in the period of the app',
        });
        expect(toggle).not.toBeChecked();

        await userEvent.click(toggle);
        expect(onChange).toHaveBeenLastCalledWith({
          source: { type: 'cases', followTimeRange: true },
        });

        await userEvent.click(toggle);
        expect(onChange).toHaveBeenLastCalledWith({
          source: { type: 'cases', followTimeRange: undefined },
        });
      });
    });

    describe('counting', () => {
      it('is offered to a stat, which shows one value, and not to a table', () => {
        setup(cases(), { canCount: false });
        expect(screen.queryByText('Show how many there are')).not.toBeInTheDocument();
      });

      it('shows only how many there are when asked to, and then has no order or size to set', async () => {
        const onChange = setup(cases(), { canCount: true });

        // By its label: with two switches the test environment gives their labels one id.
        await userEvent.click(screen.getByText('Show how many there are'));

        expect(onChange).toHaveBeenLastCalledWith({ source: { type: 'cases', count: true } });
        expect(screen.queryByLabelText('Sort by')).not.toBeInTheDocument();
        expect(
          screen.queryByRole('spinbutton', { name: 'How many at most' })
        ).not.toBeInTheDocument();
      });
    });
  });
});
