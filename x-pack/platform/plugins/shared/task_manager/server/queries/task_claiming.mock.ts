/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable, Subject } from 'rxjs';
import { TaskClaim } from '../task_events';

import { TaskClaiming } from './task_claiming';

interface TaskClaimingOptions {
  maxAttempts?: number;
  taskManagerId?: string;
  events?: Observable<TaskClaim>;
}
export const taskClaimingMock = {
  create({
    maxAttempts = 0,
    taskManagerId = '',
    events = new Subject<TaskClaim>(),
  }: TaskClaimingOptions) {
    const mocked = {
      claimAvailableTasks: jest.fn(),
      claimAvailableTasksIfCapacityIsAvailable: jest.fn(),
      maxAttempts,
      taskManagerId,
      events,
    } as unknown as jest.Mocked<TaskClaiming>;
    return mocked;
  },
};
