/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEventsMaintenanceState } from '../../../../common/maintenance/state_machine';
import { internalEventsRoutes } from './route';

jest.mock('../../utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn().mockResolvedValue(undefined),
}));

const investigateRoute =
  internalEventsRoutes['POST /internal/significant_events/events/{id}/investigate'];

type HandlerParams = Parameters<typeof investigateRoute.handler>[0];

const makeMaintenanceService = (state: SignificantEventsMaintenanceState = 'enabled') => ({
  getState: jest.fn().mockResolvedValue(state),
});

describe('POST /internal/significant_events/events/{id}/investigate', () => {
  it('rejects with 409 while paused before loading the event', async () => {
    const findByEventUuid = jest.fn();
    const handlerParams = {
      params: { path: { id: 'event-1' } },
      request: {},
      getScopedClients: jest.fn().mockResolvedValue({
        licensing: {},
        getEventClient: () => ({ findByEventUuid }),
      }),
      server: { workflowsManagement: {}, agentBuilder: {}, spaces: {} },
      logger: { warn: jest.fn(), get: jest.fn().mockReturnValue({ warn: jest.fn() }) },
      maintenanceService: makeMaintenanceService('paused'),
    } as unknown as HandlerParams;

    await expect(investigateRoute.handler(handlerParams)).rejects.toMatchObject({
      output: { statusCode: 409 },
    });
    expect(findByEventUuid).not.toHaveBeenCalled();
  });
});
