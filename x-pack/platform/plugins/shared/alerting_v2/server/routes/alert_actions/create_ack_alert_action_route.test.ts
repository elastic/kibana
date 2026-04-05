/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAckAlertActionBodySchema } from '@kbn/alerting-v2-schemas';
import { CreateAckAlertActionRoute } from './create_ack_alert_action_route';

describe('CreateAckAlertActionRoute', () => {
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
    const body = { episode_id: 'ep-1' };
    const { request, response, alertActionsClient } = createDeps(body);
    const route = new CreateAckAlertActionRoute(
      request as any,
      response as any,
      alertActionsClient as any
    );

    const result = await route.handle();

    expect(alertActionsClient.createAction).toHaveBeenCalledWith({
      groupHash,
      action: { action_type: 'ack', ...body },
    });
    expect(result).toBe(noContentResult);
  });

  it('returns customError on failure', async () => {
    const { request, response, alertActionsClient } = createDeps({ episode_id: 'ep-1' });
    alertActionsClient.createAction.mockRejectedValueOnce(new Error('boom'));
    const route = new CreateAckAlertActionRoute(
      request as any,
      response as any,
      alertActionsClient as any
    );

    const result = await route.handle();

    expect(response.customError).toHaveBeenCalledTimes(1);
    expect(result).toBe(customErrorResult);
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
