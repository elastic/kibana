/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { isInvestigationAvailable } from './is_investigation_available';

const request = {} as KibanaRequest;

it('returns whether an investigation connector resolves', async () => {
  const getForFeature = jest
    .fn()
    .mockResolvedValue({ endpoints: [{ connectorId: 'connector-1' }] });

  await expect(
    isInvestigationAvailable({
      request,
      searchInferenceEndpoints: { endpoints: { getForFeature } } as never,
    })
  ).resolves.toBe(true);
  expect(getForFeature).toHaveBeenCalledWith('significant_events_investigation', request);
});

it('returns false when no connector or inference plugin is available', async () => {
  const getForFeature = jest.fn().mockResolvedValue({ endpoints: [] });

  await expect(
    isInvestigationAvailable({
      request,
      searchInferenceEndpoints: { endpoints: { getForFeature } } as never,
    })
  ).resolves.toBe(false);
  await expect(isInvestigationAvailable({ request })).resolves.toBe(false);
});
