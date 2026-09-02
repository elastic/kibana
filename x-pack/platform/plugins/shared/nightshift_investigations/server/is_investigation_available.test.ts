/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { isInvestigationAvailable } from './is_investigation_available';

const request = {} as KibanaRequest;
const workflow = { enabled: true, valid: true, definition: {} };
const agentBuilder = {} as never;
const workflowsExtensions = {} as never;
const workflowsManagement = {
  management: { getWorkflow: jest.fn().mockResolvedValue(workflow) },
} as never;

it('returns true when every start requirement is available', async () => {
  const getForFeature = jest
    .fn()
    .mockResolvedValue({ endpoints: [{ connectorId: 'connector-1' }] });

  await expect(
    isInvestigationAvailable({
      request,
      agentBuilder,
      searchInferenceEndpoints: { endpoints: { getForFeature } } as never,
      workflowsExtensions,
      workflowsManagement,
    })
  ).resolves.toBe(true);
  expect(getForFeature).toHaveBeenCalledWith('significant_events_investigation', request);
});

it('returns false when any dependency, connector, or executable workflow is unavailable', async () => {
  const getForFeature = jest.fn().mockResolvedValue({ endpoints: [] });

  await expect(
    isInvestigationAvailable({
      request,
      agentBuilder,
      searchInferenceEndpoints: { endpoints: { getForFeature } } as never,
      workflowsExtensions,
      workflowsManagement,
    })
  ).resolves.toBe(false);
  await expect(isInvestigationAvailable({ request })).resolves.toBe(false);
  await expect(
    isInvestigationAvailable({
      request,
      agentBuilder,
      searchInferenceEndpoints: {
        endpoints: {
          getForFeature: jest
            .fn()
            .mockResolvedValue({ endpoints: [{ connectorId: 'connector-1' }] }),
        },
      } as never,
      workflowsExtensions,
      workflowsManagement: {
        management: { getWorkflow: jest.fn().mockResolvedValue({ ...workflow, enabled: false }) },
      } as never,
    })
  ).resolves.toBe(false);
});

it('returns false when a requirement probe fails', async () => {
  await expect(
    isInvestigationAvailable({
      request,
      agentBuilder,
      searchInferenceEndpoints: {
        endpoints: { getForFeature: jest.fn().mockRejectedValue(new Error('unavailable')) },
      } as never,
      workflowsExtensions,
      workflowsManagement,
    })
  ).resolves.toBe(false);
});
