/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { z } from '@kbn/zod/v4';
import { appDocumentSchema } from '@kbn/custom-app-common';
import {
  defineCapability,
  registerCapability,
  type CapabilityViewProps as CustomAppCapabilityViewProps,
} from '@kbn/custom-app-registry';
import { renderApp } from '../components/test_utils';

const mockRun = jest.fn();
jest.mock('../services', () => ({
  getServices: () => ({ core: { http: {} }, search: jest.fn() }),
}));
jest.mock('../data/run_esql_query', () => ({
  createRunEsqlQuery:
    () =>
    (...args: unknown[]) =>
      mockRun(...args),
}));

const gauge = defineCapability({
  kind: 'component',
  id: 'gauge',
  version: 1,
  props: z.object({ title: z.string().describe('What it measures.') }),
  doc: {
    summary: 'A dial.',
    whenToUse: 'For a value in a range.',
    example: { type: 'gauge', id: 'load', title: 'Load' },
  },
  interpolated: ['title'],
});

interface Gauge {
  type: 'gauge';
  id: string;
  title: string;
}

const Gauge = ({
  node,
  text,
  context,
  state,
  runQuery,
  setValue,
}: CustomAppCapabilityViewProps<Gauge>) => (
  <div data-test-subj="gauge">
    <span>{text(node.title)}</span>
    <span data-test-subj="period">{context?.timeRange?.from}</span>
    <span data-test-subj="region">{String(state.region)}</span>
    <button type="button" onClick={() => runQuery('ROW a = 1', new AbortController().signal)}>
      {'run'}
    </button>
    <button type="button" onClick={() => setValue('region', 'us')}>
      {'set'}
    </button>
  </div>
);

describe('a capability that another plugin registers', () => {
  beforeAll(() => registerCapability(gauge, async () => ({ default: Gauge })));

  const document = () =>
    appDocumentSchema.parse({
      state: { region: { type: 'string', default: 'eu' } },
      root: { type: 'gauge', id: 'load', title: 'Load in {{state.region}}' },
    });

  it('is accepted in a document and drawn, with what the app gives it', async () => {
    await renderApp(document(), async () => ({ columns: [], rows: [] }));

    expect(await screen.findByText('Load in eu')).toBeInTheDocument();
    expect(screen.getByTestId('period')).toHaveTextContent('now-15m');
    expect(screen.getByTestId('region')).toHaveTextContent('eu');
  });

  it('can run a query as the person looking, with the context and the values of the app', async () => {
    mockRun.mockResolvedValue({ columns: [], rows: [] });
    await renderApp(document(), async () => ({ columns: [], rows: [] }));

    await userEvent.click(await screen.findByRole('button', { name: 'run' }));

    expect(mockRun).toHaveBeenCalledWith(
      'ROW a = 1',
      expect.objectContaining({
        context: expect.objectContaining({ timeRange: { from: 'now-15m', to: 'now' } }),
        state: { region: 'eu' },
      }),
      expect.any(AbortSignal)
    );
  });

  it('can set a value of the app, and the app follows', async () => {
    await renderApp(document(), async () => ({ columns: [], rows: [] }));

    await userEvent.click(await screen.findByRole('button', { name: 'set' }));

    await waitFor(() => expect(screen.getByTestId('region')).toHaveTextContent('us'));
    expect(screen.getByText('Load in us')).toBeInTheDocument();
  });
});
