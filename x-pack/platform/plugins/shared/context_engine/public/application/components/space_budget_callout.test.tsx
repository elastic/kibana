/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { coreMock } from '@kbn/core/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import type {
  BucketBudgetStatus,
  BudgetState,
  SpaceBudgetStatusResponse,
} from '../../../common/budgets';
import { SPACE_BUDGETS_PATH } from '../../../common/constants';
import { SpaceBudgetCallout } from './space_budget_callout';

const bucket = (state: BudgetState): BucketBudgetStatus => ({
  ...(state !== 'unlimited' && { limit_usd: 10 }),
  spend: {
    cost_usd: state === 'exhausted' ? 10 : 1,
    unpriced_tokens: 0,
    tokens: { input_tokens: 0, output_tokens: 0, cached_tokens: 0 },
  },
  state,
});

const response = (
  space: BudgetState,
  indices: Array<[string, BudgetState]>
): SpaceBudgetStatusResponse => ({
  period: { start: '2026-10-01T00:00:00.000Z', end: '2026-11-01T00:00:00.000Z' },
  pricing: { source: 'elastic_price_catalog' },
  space: { automations: bucket(space), suggestions: bucket('unlimited') },
  ai_indices: indices.map(([id, state]) => ({
    id,
    buckets: { automations: bucket(state), suggestions: bucket('unlimited') },
  })),
});

const renderCallout = (body: SpaceBudgetStatusResponse) => {
  const services = coreMock.createStart();
  services.http.get.mockResolvedValue(body);
  render(
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider services={services}>
          <QueryClientProvider
            client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
          >
            <SpaceBudgetCallout />
          </QueryClientProvider>
        </KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );
  return services;
};

describe('SpaceBudgetCallout', () => {
  it('names the AI indices whose budget is spent', async () => {
    const services = renderCallout(
      response('ok', [
        ['tickets', 'exhausted'],
        ['docs', 'ok'],
      ])
    );

    expect(await screen.findByTestId('contextSpaceBudgetCallout')).toHaveTextContent(
      'AI work is paused until Nov 1, 2026 for AI index tickets'
    );
    expect(services.http.get).toHaveBeenCalledWith(SPACE_BUDGETS_PATH, expect.anything());
  });

  it('says the whole space is paused when the space budget is spent', async () => {
    renderCallout(response('exhausted', [['tickets', 'ok']]));

    expect(await screen.findByTestId('contextSpaceBudgetCallout')).toHaveTextContent(
      'The monthly AI budget of this space is spent'
    );
  });

  it('renders nothing while every budget has room left', async () => {
    const services = renderCallout(response('warning', [['tickets', 'warning']]));

    await waitFor(() => expect(services.http.get).toHaveBeenCalled());
    expect(screen.queryByTestId('contextSpaceBudgetCallout')).not.toBeInTheDocument();
  });
});
