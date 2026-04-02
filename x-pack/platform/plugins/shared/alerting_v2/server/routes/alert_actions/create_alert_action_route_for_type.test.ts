/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_EPISODE_ACTION_TYPE,
  createTagAlertActionBodySchema,
} from '@kbn/alerting-v2-schemas';
import { createAlertActionRouteForType } from './create_alert_action_route_for_type';

describe('createAlertActionRouteForType', () => {
  const noContentResult = { noContent: true };
  const customErrorResult = { customError: true };

  const buildDeps = (body: Record<string, unknown>) => {
    const request = {
      params: { group_hash: 'group-1' },
      body,
    };
    const response = {
      noContent: jest.fn().mockReturnValue(noContentResult),
      customError: jest.fn().mockReturnValue(customErrorResult),
    };
    const alertActionsClient = {
      createAction: jest.fn(),
    };
    return { request, response, alertActionsClient };
  };

  it('creates a route class with expected static metadata', () => {
    const suffix = '_tag';
    const RouteClass = createAlertActionRouteForType({
      actionType: ALERT_EPISODE_ACTION_TYPE.TAG,
      pathSuffix: suffix,
      bodySchema: createTagAlertActionBodySchema,
    });

    expect(RouteClass.method).toBe('post');
    expect(RouteClass.path).toBe(`/api/alerting/v2/alerts/{group_hash}/action/${suffix}`);
    expect(RouteClass.validate).toBeDefined();
  });

  it('injects inferred action_type into createAction payload', async () => {
    const RouteClass = createAlertActionRouteForType({
      actionType: ALERT_EPISODE_ACTION_TYPE.TAG,
      pathSuffix: '_tag',
      bodySchema: createTagAlertActionBodySchema,
    });
    const { request, response, alertActionsClient } = buildDeps({ tags: ['p1'] });
    const route = new RouteClass(request as any, response as any, alertActionsClient as any);

    const result = await route.handle();

    expect(alertActionsClient.createAction).toHaveBeenCalledWith({
      groupHash: 'group-1',
      action: {
        action_type: 'tag',
        tags: ['p1'],
      },
    });
    expect(result).toBe(noContentResult);
  });

  it('maps thrown error to customError response', async () => {
    const RouteClass = createAlertActionRouteForType({
      actionType: ALERT_EPISODE_ACTION_TYPE.TAG,
      pathSuffix: '_tag',
      bodySchema: createTagAlertActionBodySchema,
    });
    const { request, response, alertActionsClient } = buildDeps({ tags: ['p1'] });
    alertActionsClient.createAction.mockRejectedValueOnce(new Error('boom'));
    const route = new RouteClass(request as any, response as any, alertActionsClient as any);

    const result = await route.handle();

    expect(response.customError).toHaveBeenCalledTimes(1);
    expect(result).toBe(customErrorResult);
  });
});
