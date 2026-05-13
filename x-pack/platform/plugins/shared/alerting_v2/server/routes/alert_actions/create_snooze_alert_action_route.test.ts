/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { createSnoozeAlertActionBodySchema } from '@kbn/alerting-v2-schemas';
import type { AlertActionsClient } from '../../lib/alert_actions_client';
import { createAlertActionsClientMock } from '../../lib/alert_actions_client/alert_actions_client.mock';
import { CreateSnoozeAlertActionRoute } from './create_snooze_alert_action_route';
import { createRouteDependencies } from '../test_utils';

describe('CreateSnoozeAlertActionRoute', () => {
  const groupHash = 'group-1';

  it('injects action_type and returns noContent', async () => {
    const { ctx } = createRouteDependencies();
    const request = {
      params: { group_hash: groupHash },
      body: {},
    } as unknown as KibanaRequest;
    const alertActionsClient = createAlertActionsClientMock();
    const route = new CreateSnoozeAlertActionRoute(
      ctx,
      request,
      alertActionsClient as unknown as AlertActionsClient
    );

    await route.handle();

    expect(alertActionsClient.createAction).toHaveBeenCalledWith({
      groupHash,
      action: { action_type: 'snooze' },
    });
    expect(ctx.response.noContent).toHaveBeenCalled();
  });

  it('passes expiry through for snooze action payload', async () => {
    const body = { expiry: '2026-01-28T16:03:00.000Z' };
    const { ctx } = createRouteDependencies();
    const request = { params: { group_hash: groupHash }, body } as unknown as KibanaRequest;
    const alertActionsClient = createAlertActionsClientMock();
    const route = new CreateSnoozeAlertActionRoute(
      ctx,
      request,
      alertActionsClient as unknown as AlertActionsClient
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
    const { ctx } = createRouteDependencies();
    const request = {
      params: { group_hash: groupHash },
      body: {},
    } as unknown as KibanaRequest;
    const alertActionsClient = createAlertActionsClientMock();
    alertActionsClient.createAction.mockRejectedValueOnce(new Error('boom'));
    const route = new CreateSnoozeAlertActionRoute(
      ctx,
      request,
      alertActionsClient as unknown as AlertActionsClient
    );

    await route.handle();

    expect(ctx.response.customError).toHaveBeenCalledTimes(1);
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
