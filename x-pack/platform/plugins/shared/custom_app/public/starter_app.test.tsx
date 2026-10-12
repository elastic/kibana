/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RunQuery, SourceData } from './data/data_layer';
import { createDefaultDocument, SERVICES_QUERY, SERVICE_DETAIL_QUERY } from './default_document';
import { renderApp } from './components/test_utils';

const SERVICES: ReadonlyArray<[string, number]> = [
  ['checkout', 12],
  ['cart', 3],
  ['search', 27],
];

/** Answers the starter document's two queries the way Elasticsearch would. */
const runQuery = jest.fn<ReturnType<RunQuery>, Parameters<RunQuery>>(async (source, { state }) => {
  if (source.query === SERVICES_QUERY) {
    return {
      columns: [
        { name: 'service', type: 'keyword' },
        { name: 'errors', type: 'integer' },
      ],
      rows: SERVICES.map(([service, errors]) => [service, errors]),
    } satisfies SourceData;
  }
  if (source.query === SERVICE_DETAIL_QUERY) {
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
  throw new Error(`Unexpected query: ${source.query}`);
});

const queriesRun = () => runQuery.mock.calls.map(([source]) => source.query);

describe('the starter app', () => {
  beforeEach(() => runQuery.mockClear());

  it('lists the services and only asks for the detail once one is picked', async () => {
    await renderApp(createDefaultDocument(), runQuery);

    expect(await screen.findByText('checkout')).toBeInTheDocument();
    expect(screen.getByText('search')).toBeInTheDocument();
    expect(queriesRun()).toEqual([SERVICES_QUERY]);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens the detail for the clicked service, passing it as the query parameter', async () => {
    await renderApp(createDefaultDocument(), runQuery);

    await userEvent.click(await screen.findByRole('button', { name: 'cart' }));

    expect(await screen.findByRole('heading', { name: 'Service cart' })).toBeInTheDocument();
    expect(await screen.findByText('cart-team')).toBeInTheDocument();
    const detailRun = runQuery.mock.calls.find(([source]) => source.query === SERVICE_DETAIL_QUERY);
    expect(detailRun?.[1].state).toEqual({ service: 'cart' });
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
});
