/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RunQuery, SourceData } from './data/data_layer';
import {
  createDefaultDocument,
  ERRORS_COUNT_QUERY,
  ERROR_BUDGET_QUERY,
  SERVICES_COUNT_QUERY,
  SERVICES_QUERY,
  SERVICE_DETAIL_QUERY,
} from './default_document';
import { renderApp } from './components/test_utils';

const SERVICES: ReadonlyArray<[string, number]> = [
  ['checkout', 12],
  ['cart', 3],
  ['search', 27],
];

/** Answers the starter document's two queries the way Elasticsearch would. */
const runQuery = jest.fn<ReturnType<RunQuery>, Parameters<RunQuery>>(async (query, { state }) => {
  if (query === SERVICES_QUERY) {
    const needle = String(state.nameFilter);
    const minimum = Number(state.minErrors);
    const matching = SERVICES.filter(
      ([service, errors]) => service.includes(needle) && errors >= minimum
    );
    return {
      columns: [
        { name: 'service', type: 'keyword' },
        { name: 'errors', type: 'integer' },
      ],
      rows: matching.map(([service, errors]) => [service, errors]),
    } satisfies SourceData;
  }
  if (query === SERVICE_DETAIL_QUERY) {
    const [service, errors] = SERVICES.find(([name]) => name === state.service) ?? [];
    return {
      columns: [
        { name: 'service', type: 'keyword' },
        { name: 'errors', type: 'integer' },
        { name: 'owner', type: 'keyword' },
      ],
      rows: service ? [[service, errors, `${service}-team`]] : [],
    } satisfies SourceData;
  }
  if (query === SERVICES_COUNT_QUERY || query === ERRORS_COUNT_QUERY) {
    const [now, before] = query === SERVICES_COUNT_QUERY ? [4, 3] : [47, 52];
    return {
      columns: [
        { name: 'now', type: 'long' },
        { name: 'before', type: 'long' },
      ],
      rows: [[now, before]],
    } satisfies SourceData;
  }
  if (query === ERROR_BUDGET_QUERY) {
    return { columns: [{ name: 'used', type: 'long' }], rows: [[62]] } satisfies SourceData;
  }
  throw new Error(`Unexpected query: ${query}`);
});

// Kibana's Jest setup gives every generated id the same value, so with two form rows on the
// page their labels cannot be told apart; the select is the only combobox, so find it by role.
const queriesRun = () => runQuery.mock.calls.map(([query]) => query);

describe('the starter app', () => {
  beforeEach(() => runQuery.mockClear());

  it('lists the services and only asks for the detail once one is picked', async () => {
    await renderApp(createDefaultDocument(), runQuery);

    expect(await screen.findByText('checkout')).toBeInTheDocument();
    expect(screen.getByText('search')).toBeInTheDocument();
    expect(queriesRun()).toContain(SERVICES_QUERY);
    expect(queriesRun()).not.toContain(SERVICE_DETAIL_QUERY);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens the detail for the clicked service, passing it as the query parameter', async () => {
    await renderApp(createDefaultDocument(), runQuery);

    await userEvent.click(await screen.findByRole('button', { name: 'cart' }));

    expect(await screen.findByRole('heading', { name: 'Service cart' })).toBeInTheDocument();
    expect(await screen.findByText('cart-team')).toBeInTheDocument();
    const detailRun = runQuery.mock.calls.find(([query]) => query === SERVICE_DETAIL_QUERY);
    expect(detailRun?.[1].state).toMatchObject({ service: 'cart' });
  });

  it('shows another service when another row is picked after closing', async () => {
    await renderApp(createDefaultDocument(), runQuery);

    await userEvent.click(await screen.findByRole('button', { name: 'cart' }));
    await screen.findByText('cart-team');
    await userEvent.click(screen.getByTestId('euiFlyoutCloseButton'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: 'search' }));

    expect(await screen.findByRole('heading', { name: 'Service search' })).toBeInTheDocument();
    expect(await screen.findByText('search-team')).toBeInTheDocument();
    expect(screen.queryByText('cart-team')).not.toBeInTheDocument();
  });

  it('does not run the services query again for a selection, only the detail', async () => {
    await renderApp(createDefaultDocument(), runQuery);

    await userEvent.click(await screen.findByRole('button', { name: 'checkout' }));
    await screen.findByText('checkout-team');

    expect(queriesRun().filter((query) => query === SERVICES_QUERY)).toHaveLength(1);
  });

  describe('what it shows of the components', () => {
    it('shows the numbers with how they changed, and the error budget', async () => {
      await renderApp(createDefaultDocument(), runQuery);

      expect(await screen.findByText('Services running')).toBeInTheDocument();
      const changes = await screen.findAllByTestId('customAppMetricChange');
      expect(changes.map((change) => change.textContent?.trim())).toEqual(['+33.3%', '-9.6%']);
      expect(await screen.findByText('62 / 100')).toBeInTheDocument();
      expect(screen.getByText('On track')).toBeInTheDocument();
    });

    it('shows the tip while the switch is on, and hides it when the switch is turned off', async () => {
      await renderApp(createDefaultDocument(), runQuery);

      expect(
        await screen.findByText('Everything here follows the values of the app')
      ).toBeInTheDocument();

      await userEvent.click(screen.getByRole('switch'));

      expect(
        screen.queryByText('Everything here follows the values of the app')
      ).not.toBeInTheDocument();
    });

    it('has a second tab that says what can be done', async () => {
      await renderApp(createDefaultDocument(), runQuery);

      await userEvent.click(await screen.findByRole('tab', { name: 'What you can do' }));

      expect(await screen.findByText(/use your own data/)).toBeInTheDocument();
      expect(screen.queryByText('checkout')).not.toBeInTheDocument();
    });
  });

  describe('filters', () => {
    const servicesRuns = () => queriesRun().filter((query) => query === SERVICES_QUERY).length;

    it('narrows the list by name, and runs only the services query again', async () => {
      await renderApp(createDefaultDocument(), runQuery);
      await screen.findByText('checkout');

      await userEvent.type(screen.getByRole('searchbox', { name: 'Service name' }), 'che{Enter}');

      await waitFor(() => expect(screen.queryByText('cart')).not.toBeInTheDocument());
      expect(screen.getByText('checkout')).toBeInTheDocument();
      expect(screen.queryByText('search')).not.toBeInTheDocument();
      expect(servicesRuns()).toBe(2);
      expect(queriesRun()).not.toContain(SERVICE_DETAIL_QUERY);
    });

    it('narrows the list by the minimum number of errors', async () => {
      await renderApp(createDefaultDocument(), runQuery);
      await screen.findByText('cart');

      await userEvent.selectOptions(screen.getByRole('combobox'), '10');

      await waitFor(() => expect(screen.queryByText('cart')).not.toBeInTheDocument());
      expect(screen.getByText('checkout')).toBeInTheDocument();
      expect(screen.getByText('search')).toBeInTheDocument();
      expect(servicesRuns()).toBe(2);
    });

    it('does not run the services query again for a selection that is not a filter', async () => {
      await renderApp(createDefaultDocument(), runQuery);

      await userEvent.click(await screen.findByRole('button', { name: 'cart' }));
      await screen.findByText('cart-team');

      expect(servicesRuns()).toBe(1);
    });

    it('keeps the filters when a service is picked, and uses both in their own queries', async () => {
      await renderApp(createDefaultDocument(), runQuery);
      await screen.findByText('cart');
      await userEvent.selectOptions(screen.getByRole('combobox'), '10');
      await waitFor(() => expect(screen.queryByText('cart')).not.toBeInTheDocument());

      await userEvent.click(screen.getByRole('button', { name: 'search' }));
      await screen.findByText('search-team');

      const servicesRun = runQuery.mock.calls.filter(([query]) => query === SERVICES_QUERY);
      expect(servicesRun[servicesRun.length - 1][1].state).toMatchObject({ minErrors: '10' });
    });
  });
});
