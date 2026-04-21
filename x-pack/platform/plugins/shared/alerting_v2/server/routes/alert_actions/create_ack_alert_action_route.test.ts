/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { createAckAlertActionBodySchema } from '@kbn/alerting-v2-schemas';
import type { AlertActionsClient } from '../../lib/alert_actions_client';
import { createAlertActionsClientMock } from '../../lib/alert_actions_client/alert_actions_client.mock';
import { CreateAckAlertActionRoute } from './create_ack_alert_action_route';
import { createRouteDependencies } from '../test_utils';

describe('CreateAckAlertActionRoute', () => {
  const groupHash = 'group-1';

  it('injects action_type and returns noContent', async () => {
    const body = { episode_id: 'ep-1' };
    const { ctx } = createRouteDependencies();
    const request = { params: { group_hash: groupHash }, body } as unknown as KibanaRequest;
    const alertActionsClient = createAlertActionsClientMock();
    const route = new CreateAckAlertActionRoute(
      ctx,
      request,
      alertActionsClient as unknown as AlertActionsClient
    );

    await route.handle();

    expect(alertActionsClient.createAction).toHaveBeenCalledWith({
      groupHash,
      action: { action_type: 'ack', ...body },
    });
    expect(ctx.response.noContent).toHaveBeenCalled();
  });

  it('returns customError on failure', async () => {
    const { ctx } = createRouteDependencies();
    const request = {
      params: { group_hash: groupHash },
      body: { episode_id: 'ep-1' },
    } as unknown as KibanaRequest;
    const alertActionsClient = createAlertActionsClientMock();
    alertActionsClient.createAction.mockRejectedValueOnce(new Error('boom'));
    const route = new CreateAckAlertActionRoute(
      ctx,
      request,
      alertActionsClient as unknown as AlertActionsClient
    );

    await route.handle();

    expect(ctx.response.customError).toHaveBeenCalledTimes(1);
  });
});

describe('createAckAlertActionBodySchema', () => {
  it('accepts payload without action_type', () => {
    expect(createAckAlertActionBodySchema.safeParse({ episode_id: 'ep-1' }).success).toBe(true);
  });

  it('rejects payload with action_type', () => {
    expect(
      createAckAlertActionBodySchema.safeParse({ action_type: 'ack', episode_id: 'ep-1' }).success
    ).toBe(false);
  });
});
