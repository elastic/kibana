/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { AlertActionsClient } from '../../lib/alert_actions_client';
import { createAlertActionsClientMock } from '../../lib/alert_actions_client/alert_actions_client.mock';
import { CreateAssignAlertActionRoute } from './create_assign_alert_action_route';
import { createRouteDependencies } from '../test_utils';

describe('CreateAssignAlertActionRoute', () => {
  const groupHash = 'group-1';

  it('injects action_type and returns noContent', async () => {
    const body = { episode_id: 'ep-1' };
    const { ctx } = createRouteDependencies();
    const request = { params: { group_hash: groupHash }, body } as unknown as KibanaRequest;
    const alertActionsClient = createAlertActionsClientMock();
    const route = new CreateAssignAlertActionRoute(
      ctx,
      request,
      alertActionsClient as unknown as AlertActionsClient
    );

    await route.handle();

    expect(alertActionsClient.createAction).toHaveBeenCalledWith({
      groupHash,
      action: { action_type: 'assign', ...body },
    });
    expect(ctx.response.noContent).toHaveBeenCalled();
  });
});
