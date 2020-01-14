/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TaskRunnerFactory } from './task_runner';
import { AlertTypeRegistry } from './alert_type_registry';
import { taskManagerMock } from '../../../../plugins/task_manager/server/task_manager.mock';

const taskManager = taskManagerMock.setup();
const alertTypeRegistryParams = {
  taskManager,
  taskRunnerFactory: new TaskRunnerFactory(),
};

beforeEach(() => jest.resetAllMocks());

describe('has()', () => {
  test('returns false for unregistered alert types', () => {
    const registry = new AlertTypeRegistry(alertTypeRegistryParams);
    expect(registry.has('foo')).toEqual(false);
  });

  test('returns true for registered alert types', () => {
    const registry = new AlertTypeRegistry(alertTypeRegistryParams);
    registry.register({
      id: 'foo',
      name: 'Foo',
      actionGroups: [],
      executor: jest.fn(),
    });
    expect(registry.has('foo')).toEqual(true);
  });
});

describe('register()', () => {
  test('registers the executor with the task manager', () => {
    const alertType = {
      id: 'test',
      name: 'Test',
      actionGroups: [],
      executor: jest.fn(),
    };
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const registry = new AlertTypeRegistry(alertTypeRegistryParams);
    registry.register(alertType);
    expect(taskManager.registerTaskDefinitions).toHaveBeenCalledTimes(1);
    expect(taskManager.registerTaskDefinitions.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "alerting:test": Object {
            "createTaskRunner": [Function],
            "title": "Test",
            "type": "alerting:test",
          },
        },
      ]
    `);
  });

  test('should throw an error if type is already registered', () => {
    const registry = new AlertTypeRegistry(alertTypeRegistryParams);
    registry.register({
      id: 'test',
      name: 'Test',
      actionGroups: [],
      executor: jest.fn(),
    });
    expect(() =>
      registry.register({
        id: 'test',
        name: 'Test',
        actionGroups: [],
        executor: jest.fn(),
      })
    ).toThrowErrorMatchingInlineSnapshot(`"Alert type \\"test\\" is already registered."`);
  });
});

describe('get()', () => {
  test('should return registered type', () => {
    const registry = new AlertTypeRegistry(alertTypeRegistryParams);
    registry.register({
      id: 'test',
      name: 'Test',
      actionGroups: [],
      executor: jest.fn(),
    });
    const alertType = registry.get('test');
    expect(alertType).toMatchInlineSnapshot(`
      Object {
        "actionGroups": Array [],
        "executor": [MockFunction],
        "id": "test",
        "name": "Test",
      }
    `);
  });

  test(`should throw an error if type isn't registered`, () => {
    const registry = new AlertTypeRegistry(alertTypeRegistryParams);
    expect(() => registry.get('test')).toThrowErrorMatchingInlineSnapshot(
      `"Alert type \\"test\\" is not registered."`
    );
  });
});

describe('list()', () => {
  test('should return empty when nothing is registered', () => {
    const registry = new AlertTypeRegistry(alertTypeRegistryParams);
    const result = registry.list();
    expect(result).toMatchInlineSnapshot(`Array []`);
  });

  test('should return registered types', () => {
    const registry = new AlertTypeRegistry(alertTypeRegistryParams);
    registry.register({
      id: 'test',
      name: 'Test',
      actionGroups: [],
      executor: jest.fn(),
    });
    const result = registry.list();
    expect(result).toMatchInlineSnapshot(`
      Array [
        Object {
          "id": "test",
          "name": "Test",
        },
      ]
    `);
  });
});
