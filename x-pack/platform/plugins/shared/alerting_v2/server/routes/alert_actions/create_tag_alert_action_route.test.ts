/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTagAlertActionBodySchema } from '@kbn/alerting-v2-schemas';
import { CreateTagAlertActionRoute } from './create_tag_alert_action_route';

describe('CreateTagAlertActionRoute', () => {
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
    const body = { tags: ['p1', 'p2'] };
    const { request, response, alertActionsClient } = createDeps(body);
    const route = new CreateTagAlertActionRoute(
      request as any,
      response as any,
      alertActionsClient as any
    );

    const result = await route.handle();

    expect(alertActionsClient.createAction).toHaveBeenCalledWith({
      groupHash,
      action: { action_type: 'tag', ...body },
    });
    expect(result).toBe(noContentResult);
  });

  it('returns customError on failure', async () => {
    const { request, response, alertActionsClient } = createDeps({ tags: ['x'] });
    alertActionsClient.createAction.mockRejectedValueOnce(new Error('boom'));
    const route = new CreateTagAlertActionRoute(
      request as any,
      response as any,
      alertActionsClient as any
    );

    const result = await route.handle();

    expect(response.customError).toHaveBeenCalledTimes(1);
    expect(result).toBe(customErrorResult);
  });
});

describe('createTagAlertActionBodySchema', () => {
  it('accepts payload without action_type', () => {
    expect(createTagAlertActionBodySchema.safeParse({ tags: ['foo'] }).success).toBe(true);
  });

  it('rejects payload with action_type', () => {
    expect(
      createTagAlertActionBodySchema.safeParse({ action_type: 'tag', tags: ['foo'] }).success
    ).toBe(false);
  });
});
