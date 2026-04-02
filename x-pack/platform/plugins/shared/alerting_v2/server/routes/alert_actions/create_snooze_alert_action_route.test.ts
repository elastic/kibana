/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSnoozeAlertActionBodySchema } from '@kbn/alerting-v2-schemas';
import { CreateSnoozeAlertActionRoute } from './create_snooze_alert_action_route';

describe('CreateSnoozeAlertActionRoute', () => {
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
    const body = {};
    const { request, response, alertActionsClient } = createDeps(body);
    const route = new CreateSnoozeAlertActionRoute(
      request as any,
      response as any,
      alertActionsClient as any
    );

    const result = await route.handle();

    expect(alertActionsClient.createAction).toHaveBeenCalledWith({
      groupHash,
      action: { action_type: 'snooze' },
    });
    expect(result).toBe(noContentResult);
  });

  it('passes expiry through for snooze action payload', async () => {
    const body = { expiry: '2026-01-28T16:03:00.000Z' };
    const { request, response, alertActionsClient } = createDeps(body);
    const route = new CreateSnoozeAlertActionRoute(
      request as any,
      response as any,
      alertActionsClient as any
    );

    await route.handle();

    expect(alertActionsClient.createAction).toHaveBeenCalledWith({
      groupHash,
      action: {
        action_type: 'snooze',
        expiry: '2026-01-28T16:03:00.000Z',
      },
    });
  });

  it('returns customError on failure', async () => {
    const { request, response, alertActionsClient } = createDeps({});
    alertActionsClient.createAction.mockRejectedValueOnce(new Error('boom'));
    const route = new CreateSnoozeAlertActionRoute(
      request as any,
      response as any,
      alertActionsClient as any
    );

    const result = await route.handle();

    expect(response.customError).toHaveBeenCalledTimes(1);
    expect(result).toBe(customErrorResult);
  });
});

describe('createSnoozeAlertActionBodySchema', () => {
  it('accepts empty payload without action_type', () => {
    expect(createSnoozeAlertActionBodySchema.safeParse({}).success).toBe(true);
  });

  it('accepts payload with expiry', () => {
    expect(
      createSnoozeAlertActionBodySchema.safeParse({ expiry: '2026-01-28T16:03:00.000Z' }).success
    ).toBe(true);
  });

  it('rejects payload with action_type', () => {
    expect(createSnoozeAlertActionBodySchema.safeParse({ action_type: 'snooze' }).success).toBe(
      false
    );
  });
});
