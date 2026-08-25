/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { nightshiftInvestigationsRouteRepository } from '.';

const endpoint = 'POST /internal/nightshift/investigations/{id}/lifecycle_events' as const;
const { handler } = nightshiftInvestigationsRouteRepository[endpoint];
const mockRequest = {} as KibanaRequest;

const makeResources = (emitter: jest.Mock | undefined, params: Record<string, unknown>) => ({
  request: mockRequest,
  params,
  getInvestigationsClient: jest.fn(),
  getTriggerEmitter: jest.fn().mockReturnValue(emitter),
});

it('emits the completed trigger with the expected payload', async () => {
  const emitter = jest.fn();
  const resources = makeResources(emitter, {
    path: { id: 'exec-1' },
    body: {
      status: 'completed',
      started_at: '2024-01-01T00:00:00Z',
      subject: { type: 'alert', id: 'alert-1' },
    },
  });

  const result = await handler(resources as never);

  expect(result).toEqual({ emitted: true });
  expect(emitter).toHaveBeenCalledWith('nightshift-investigations.completed', {
    investigation_id: 'exec-1',
    status: 'completed',
    subject: { type: 'alert', id: 'alert-1' },
    started_at: '2024-01-01T00:00:00Z',
    completed_at: expect.any(String),
  });
});

it('emits the failed trigger when status is failed', async () => {
  const emitter = jest.fn();
  const resources = makeResources(emitter, {
    path: { id: 'exec-2' },
    body: {
      status: 'failed',
      started_at: '2024-01-01T00:00:00Z',
      subject: { type: 'significant_event', id: '' },
    },
  });

  const result = await handler(resources as never);

  expect(result).toEqual({ emitted: true });
  expect(emitter).toHaveBeenCalledWith('nightshift-investigations.failed', {
    investigation_id: 'exec-2',
    status: 'failed',
    subject: { type: 'significant_event', id: '' },
    started_at: '2024-01-01T00:00:00Z',
    completed_at: expect.any(String),
  });
});

it('is a no-op when no trigger emitter is available', async () => {
  const resources = makeResources(undefined, {
    path: { id: 'exec-3' },
    body: {
      status: 'completed',
      started_at: '2024-01-01T00:00:00Z',
      subject: { type: 'alert', id: 'alert-2' },
    },
  });

  await expect(handler(resources as never)).resolves.toEqual({ emitted: false });
});
