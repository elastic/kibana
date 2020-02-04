/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ConcreteTaskInstance, TaskStatus } from '../../../../../plugins/task_manager/server';
import { AlertTaskInstance, taskInstanceToAlertTaskInstance } from './alert_task_instance';
import uuid from 'uuid';

const alertType = {
  id: 'test',
  name: 'My test alert',
  actionGroups: ['default'],
  executor: jest.fn(),
};

describe('Alert Task Instance', () => {
  test(`validates that a TaskInstance has valid AlertType Task State`, () => {
    const lastScheduledActionsDate = new Date();
    const taskInstance: ConcreteTaskInstance = {
      id: uuid.v4(),
      attempts: 0,
      status: TaskStatus.Running,
      version: '123',
      runAt: new Date(),
      scheduledAt: new Date(),
      startedAt: new Date(),
      retryAt: new Date(Date.now() + 5 * 60 * 1000),
      state: {
        alertTypeState: {
          some: 'value',
        },
        alertInstances: {
          first_instance: {
            state: {},
            meta: {
              lastScheduledActions: {
                group: 'first_group',
                date: lastScheduledActionsDate.toISOString(),
              },
            },
          },
          second_instance: {},
        },
      },
      taskType: 'alerting:test',
      params: {
        alertId: '1',
      },
      ownerId: null,
    };

    const alertTaskInsatnce: AlertTaskInstance = taskInstanceToAlertTaskInstance(
      alertType,
      taskInstance
    );

    expect(alertTaskInsatnce).toEqual({
      ...taskInstance,
      state: {
        alertTypeState: {
          some: 'value',
        },
        alertInstances: {
          first_instance: {
            state: {},
            meta: {
              lastScheduledActions: {
                group: 'first_group',
                date: lastScheduledActionsDate,
              },
            },
          },
          second_instance: {},
        },
      },
    });
  });

  test(`throws if state is invalid`, () => {
    const taskInstance: ConcreteTaskInstance = {
      id: '215ee69b-1df9-428e-ab1a-ccf274f8fa5b',
      attempts: 0,
      status: TaskStatus.Running,
      version: '123',
      runAt: new Date(),
      scheduledAt: new Date(),
      startedAt: new Date(),
      retryAt: new Date(Date.now() + 5 * 60 * 1000),
      state: {
        alertTypeState: {
          some: 'value',
        },
        alertInstances: {
          first_instance: 'invalid',
          second_instance: {},
        },
      },
      taskType: 'alerting:test',
      params: {
        alertId: '1',
      },
      ownerId: null,
    };

    expect(() =>
      taskInstanceToAlertTaskInstance(alertType, taskInstance)
    ).toThrowErrorMatchingInlineSnapshot(
      `"AlertType test [Task ID:  215ee69b-1df9-428e-ab1a-ccf274f8fa5b] has an invalid state: .alertInstances.first_instance"`
    );
  });

  test(`allows an initial empty state`, () => {
    const taskInstance: ConcreteTaskInstance = {
      id: uuid.v4(),
      attempts: 0,
      status: TaskStatus.Running,
      version: '123',
      runAt: new Date(),
      scheduledAt: new Date(),
      startedAt: new Date(),
      retryAt: new Date(Date.now() + 5 * 60 * 1000),
      state: {},
      taskType: 'alerting:test',
      params: {
        alertId: '1',
      },
      ownerId: null,
    };

    const alertTaskInsatnce: AlertTaskInstance = taskInstanceToAlertTaskInstance(
      alertType,
      taskInstance
    );

    expect(alertTaskInsatnce).toEqual(taskInstance);
  });
});
