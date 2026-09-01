/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { SignificantEventsMaintenanceState } from '../../../common/maintenance/state_machine';
import { SignificantEventsPausedError } from '../../lib/errors/significant_events_paused_error';
import type { SignificantEventsMaintenanceService } from '../../lib/maintenance/maintenance_service';
import { assertNotPaused } from './assert_not_paused';

const REQUEST = {} as KibanaRequest;

const makeService = (
  state: SignificantEventsMaintenanceState
): SignificantEventsMaintenanceService =>
  ({
    getState: jest.fn(async () => state),
    getStatus: jest.fn(async () => ({ state })),
    pause: jest.fn(),
    resume: jest.fn(),
  } as unknown as SignificantEventsMaintenanceService);

describe('assertNotPaused', () => {
  it('throws a 409 SignificantEventsPausedError in a state that blocks activity', async () => {
    const maintenanceService = makeService('paused');

    await expect(assertNotPaused({ maintenanceService, request: REQUEST })).rejects.toBeInstanceOf(
      SignificantEventsPausedError
    );
    await expect(assertNotPaused({ maintenanceService, request: REQUEST })).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(maintenanceService.getState).toHaveBeenCalledWith({ request: REQUEST });
    expect(maintenanceService.getStatus).not.toHaveBeenCalled();
  });

  it('resolves without throwing in a state that allows activity', async () => {
    const maintenanceService = makeService('enabled');

    await expect(
      assertNotPaused({ maintenanceService, request: REQUEST })
    ).resolves.toBeUndefined();
    expect(maintenanceService.getState).toHaveBeenCalledWith({ request: REQUEST });
    expect(maintenanceService.getStatus).not.toHaveBeenCalled();
  });
});
