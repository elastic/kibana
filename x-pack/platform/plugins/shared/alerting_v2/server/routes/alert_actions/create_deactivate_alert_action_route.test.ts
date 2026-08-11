/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { createDeactivateAlertActionBodySchema } from '@kbn/alerting-v2-schemas';
import type { AlertActionsClient } from '../../lib/alert_actions_client';
import { createAlertActionsClientMock } from '../../lib/alert_actions_client/alert_actions_client.mock';
import { CreateDeactivateAlertActionRoute } from './create_deactivate_alert_action_route';
import { createRouteDependencies } from '../test_utils';

describe('CreateDeactivateAlertActionRoute', () => {
  const groupHash = 'group-1';

  it('injects action_type and returns noContent', async () => {
    const body = { reason: 'manual pause' };
    const { ctx } = createRouteDependencies();
    const request = { params: { group_hash: groupHash }, body } as unknown as KibanaRequest;
    const alertActionsClient = createAlertActionsClientMock();
    const route = new CreateDeactivateAlertActionRoute(
      ctx,
      request,
      alertActionsClient as unknown as AlertActionsClient
    );

    await route.handle();

    expect(alertActionsClient.createAction).toHaveBeenCalledWith({
      groupHash,
      action: { action_type: 'deactivate', ...body },
    });
    expect(ctx.response.noContent).toHaveBeenCalled();
  });

  it('returns customError on failure', async () => {
    const { ctx } = createRouteDependencies();
    const request = {
      params: { group_hash: groupHash },
      body: { reason: 'x' },
    } as unknown as KibanaRequest;
    const alertActionsClient = createAlertActionsClientMock();
    alertActionsClient.createAction.mockRejectedValueOnce(new Error('boom'));
    const route = new CreateDeactivateAlertActionRoute(
      ctx,
      request,
      alertActionsClient as unknown as AlertActionsClient
    );

    await route.handle();

    expect(ctx.response.customError).toHaveBeenCalledTimes(1);
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
