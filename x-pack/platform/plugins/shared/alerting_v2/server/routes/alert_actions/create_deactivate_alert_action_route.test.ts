/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createDeactivateAlertActionBodySchema } from '@kbn/alerting-v2-schemas';
import { CreateDeactivateAlertActionRoute } from './create_deactivate_alert_action_route';

describe('CreateDeactivateAlertActionRoute', () => {
  const groupHash = 'group-1';
  const noContentResult = { noContent: true };
  const customErrorResult = { customError: true };

  const createDeps = (body: Record<string, unknown>) => {
    const request = { params: { group_hash: groupHash }, body };
    const response = {
      noContent: jest.fn().mockReturnValue(noContentResult),
      customError: jest.fn().mockReturnValue(customErrorResult),
    };
    const alertActionsClient = { createAction: jest.fn() };
    return { request, response, alertActionsClient };
  };

  it('injects action_type and returns noContent', async () => {
    const body = { reason: 'manual pause' };
    const { request, response, alertActionsClient } = createDeps(body);
    const route = new CreateDeactivateAlertActionRoute(
      request as any,
      response as any,
      alertActionsClient as any
    );

    const result = await route.handle();

    expect(alertActionsClient.createAction).toHaveBeenCalledWith({
      groupHash,
      action: { action_type: 'deactivate', ...body },
    });
    expect(result).toBe(noContentResult);
  });

  it('returns customError on failure', async () => {
    const { request, response, alertActionsClient } = createDeps({ reason: 'x' });
    alertActionsClient.createAction.mockRejectedValueOnce(new Error('boom'));
    const route = new CreateDeactivateAlertActionRoute(
      request as any,
      response as any,
      alertActionsClient as any
    );

    const result = await route.handle();

    expect(response.customError).toHaveBeenCalledTimes(1);
    expect(result).toBe(customErrorResult);
  });
});

describe('createDeactivateAlertActionBodySchema', () => {
  it('accepts payload without action_type', () => {
    expect(createDeactivateAlertActionBodySchema.safeParse({ reason: 'x' }).success).toBe(true);
  });

  it('rejects payload with action_type', () => {
    expect(
      createDeactivateAlertActionBodySchema.safeParse({ action_type: 'deactivate', reason: 'x' })
        .success
    ).toBe(false);
  });
});
