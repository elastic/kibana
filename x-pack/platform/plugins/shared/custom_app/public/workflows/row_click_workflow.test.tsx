/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { appDocumentSchema } from '@kbn/custom-app-common';
import type { RunQuery } from '../data/data_layer';
import { renderApp } from '../components/test_utils';

const mockRequest = jest.fn();
jest.mock('./workflow_runner', () => ({
  useWorkflowRunner: () => ({ availability: { canRun: true }, request: mockRequest }),
}));

const runQuery = jest.fn<ReturnType<RunQuery>, Parameters<RunQuery>>(async () => ({
  columns: [
    { name: 'host.name', type: 'keyword' },
    { name: 'errors', type: 'integer' },
  ],
  rows: [
    ['web-1', 12],
    ['web-2', 3],
  ],
}));

const document = appDocumentSchema.parse({
  state: { reason: { type: 'string', default: 'Suspicious' } },
  root: {
    type: 'table',
    id: 'hosts',
    query: 'FROM hosts',
    onRowClick: [
      {
        type: 'runWorkflow',
        workflow: 'isolate-host',
        inputs: {
          host: { fromColumn: 'host.name' },
          errors: { fromColumn: 'errors' },
          reason: { fromState: 'reason' },
        },
      },
    ],
  },
});

describe('a row click that runs a workflow', () => {
  beforeEach(() => mockRequest.mockReset());

  it('hands the workflow what is in the row that was clicked, and what the app holds', async () => {
    await renderApp(document, runQuery);

    await userEvent.click(await screen.findByRole('button', { name: 'web-2' }));

    expect(mockRequest).toHaveBeenCalledWith(
      [
        {
          workflow: 'isolate-host',
          inputs: { host: 'web-2', errors: 3, reason: 'Suspicious' },
        },
      ],
      'hosts'
    );
  });

  it('asks again for each row that is clicked, and not before one is', async () => {
    await renderApp(document, runQuery);
    await screen.findByRole('button', { name: 'web-1' });
    expect(mockRequest).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'web-1' }));
    await userEvent.click(screen.getByRole('button', { name: 'web-2' }));

    expect(mockRequest).toHaveBeenCalledTimes(2);
    expect(mockRequest.mock.calls.map(([[request]]) => request.inputs.host)).toEqual([
      'web-1',
      'web-2',
    ]);
  });
});
