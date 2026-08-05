/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import {
  ALERT_EPISODE_ACTION_TYPE,
  createTagAlertActionBodySchema,
} from '@kbn/alerting-v2-schemas';
import type { AlertActionsClient } from '../../lib/alert_actions_client';
import { createAlertActionsClientMock } from '../../lib/alert_actions_client/alert_actions_client.mock';
import { createAlertActionRouteForType } from './create_alert_action_route_for_type';
import { createRouteDependencies } from '../test_utils';

describe('createAlertActionRouteForType', () => {
  it('creates a route class with expected static metadata', () => {
    const suffix = '_tag';
    const RouteClass = createAlertActionRouteForType({
      actionType: ALERT_EPISODE_ACTION_TYPE.TAG,
      pathSuffix: suffix,
      bodySchema: createTagAlertActionBodySchema,
    });

    expect(RouteClass.method).toBe('post');
    expect(RouteClass.path).toBe(`/api/alerting/v2/alerts/{group_hash}/${suffix}`);
    expect(RouteClass.validate).toBeDefined();
  });

  it('injects inferred action_type into createAction payload', async () => {
    const RouteClass = createAlertActionRouteForType({
      actionType: ALERT_EPISODE_ACTION_TYPE.TAG,
      pathSuffix: '_tag',
      bodySchema: createTagAlertActionBodySchema,
    });
    const { ctx } = createRouteDependencies();
    const request = {
      params: { group_hash: 'group-1' },
      body: { tags: ['p1'] },
    } as unknown as KibanaRequest;
    const alertActionsClient = createAlertActionsClientMock();
    const route = new RouteClass(ctx, request, alertActionsClient as unknown as AlertActionsClient);

    await route.handle();

    expect(alertActionsClient.createAction).toHaveBeenCalledWith({
      groupHash: 'group-1',
      action: {
        action_type: 'tag',
        tags: ['p1'],
      },
    });
    expect(ctx.response.noContent).toHaveBeenCalled();
  });

  it('maps thrown error to customError response', async () => {
    const RouteClass = createAlertActionRouteForType({
      actionType: ALERT_EPISODE_ACTION_TYPE.TAG,
      pathSuffix: '_tag',
      bodySchema: createTagAlertActionBodySchema,
    });
    const { ctx } = createRouteDependencies();
    const request = {
      params: { group_hash: 'group-1' },
      body: { tags: ['p1'] },
    } as unknown as KibanaRequest;
    const alertActionsClient = createAlertActionsClientMock();
    alertActionsClient.createAction.mockRejectedValueOnce(new Error('boom'));
    const route = new RouteClass(ctx, request, alertActionsClient as unknown as AlertActionsClient);

    await route.handle();

    expect(ctx.response.customError).toHaveBeenCalledTimes(1);
  });
});
