/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { getInvestigationAvailabilityRoute } from './get_investigation_availability';

const { handler } =
  getInvestigationAvailabilityRoute['GET /internal/nightshift/investigations/availability'];
const request = {} as KibanaRequest;

it('returns whether an investigation connector resolves', async () => {
  const getForFeature = jest
    .fn()
    .mockResolvedValue({ endpoints: [{ connectorId: 'connector-1' }] });

  await expect(
    handler({
      request,
      getSearchInferenceEndpoints: () => ({ endpoints: { getForFeature } }),
    } as never)
  ).resolves.toEqual({ available: true });
  expect(getForFeature).toHaveBeenCalledWith('significant_events_investigation', request);
});

it('returns unavailable when no investigation connector resolves', async () => {
  const getForFeature = jest.fn().mockResolvedValue({ endpoints: [] });

  await expect(
    handler({
      request,
      getSearchInferenceEndpoints: () => ({ endpoints: { getForFeature } }),
    } as never)
  ).resolves.toEqual({ available: false });
});

it('returns unavailable when the inference endpoints plugin is absent', async () => {
  await expect(
    handler({ request, getSearchInferenceEndpoints: () => undefined } as never)
  ).resolves.toEqual({ available: false });
});
