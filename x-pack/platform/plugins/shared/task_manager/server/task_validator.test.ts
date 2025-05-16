/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { taskManagerMock } from './mocks';
import { mockLogger } from './test_utils';
import { TaskValidator } from './task_validator';
import { TaskTypeDictionary } from './task_type_dictionary';

const fooTaskDefinition = {
  title: 'Foo',
  description: '',
  createTaskRunner() {
    return {
      async run() {
        return {
          state: {},
        };
      },
    };
  },
};

describe('TaskValidator', () => {
  describe('getValidatedTaskInstanceFromReading()', () => {
    it(`should return the task as-is whenever the task definition isn't defined`, () => {
      const definitions = new TaskTypeDictionary(mockLogger());
      const taskValidator = new TaskValidator({
        logger: mockLogger(),
        definitions,
        allowReadingInvalidState: false,
      });
      const task = taskManagerMock.createTask();
      const result = taskValidator.getValidatedTaskInstanceFromReading(task);
      expect(result).toEqual(task);
    });

    it(`should return the task as-is whenever the validate:false option is passed-in`, () => {
      const definitions = new TaskTypeDictionary(mockLogger());
      definitions.registerTaskDefinitions({
        foo: {
          ...fooTaskDefinition,
          stateSchemaByVersion: {
            1: {
              up: (state) => state,
              schema: schema.object({
                foo: schema.string(),
              }),
            },
          },
        },
      });
      const taskValidator = new TaskValidator({
        logger: mockLogger(),
        definitions,
        allowReadingInvalidState: false,
      });
      const task = taskManagerMock.createTask();
      const result = taskValidator.getValidatedTaskInstanceFromReading(task, { validate: false });
      expect(result).toEqual(task);
    });

    // TODO: Remove skip once all task types have defined their state schema.
    // https://github.com/elastic/kibana/issues/159347
    it.skip(`should fail to validate the state schema when the task type doesn't have stateSchemaByVersion defined`, () => {
      const definitions = new TaskTypeDictionary(mockLogger());
      definitions.registerTaskDefinitions({
        foo: fooTaskDefinition,
      });
      const taskValidator = new TaskValidator({
        logger: mockLogger(),
        definitions,
        allowReadingInvalidState: false,
      });
      const task = taskManagerMock.createTask({ state: { foo: 'bar' } });
      expect(() =>
        taskValidator.getValidatedTaskInstanceFromReading(task)
      ).toThrowErrorMatchingInlineSnapshot(
        `"[TaskValidator] stateSchemaByVersion not defined for task type: foo"`
      );
    });

    it(`should validate the state schema`, () => {
      const definitions = new TaskTypeDictionary(mockLogger());
      definitions.registerTaskDefinitions({
        foo: {
          ...fooTaskDefinition,
          stateSchemaByVersion: {
            1: {
              up: (state) => state,
              schema: schema.object({
                foo: schema.string(),
              }),
            },
          },
        },
      });
      const taskValidator = new TaskValidator({
        logger: mockLogger(),
        definitions,
        allowReadingInvalidState: false,
      });
      const task = taskManagerMock.createTask({ stateVersion: 1, state: { foo: 'bar' } });
      const result = taskValidator.getValidatedTaskInstanceFromReading(task);
      expect(result).toEqual(task);
    });

    it(`should fail validation when the state schema doesn't match the state data`, () => {
      const definitions = new TaskTypeDictionary(mockLogger());
      definitions.registerTaskDefinitions({
        foo: {
          ...fooTaskDefinition,
          stateSchemaByVersion: {
            1: {
              up: (state) => state,
              schema: schema.object({
                foo: schema.string(),
              }),
            },
          },
        },
      });
      const taskValidator = new TaskValidator({
        logger: mockLogger(),
        definitions,
        allowReadingInvalidState: false,
      });
      const task = taskManagerMock.createTask({ stateVersion: 1, state: { foo: true } });
      expect(() =>
        taskValidator.getValidatedTaskInstanceFromReading(task)
      ).toThrowErrorMatchingInlineSnapshot(
        `"[foo]: expected value of type [string] but got [boolean]"`
      );
    });

    it(`should return original state when the state is invalid and allowReadingInvalidState is true`, () => {
      const definitions = new TaskTypeDictionary(mockLogger());
      definitions.registerTaskDefinitions({
        foo: {
          ...fooTaskDefinition,
          stateSchemaByVersion: {
            1: {
              up: (state) => state,
              schema: schema.object({
                foo: schema.string(),
              }),
            },
          },
        },
      });
      const taskValidator = new TaskValidator({
        logger: mockLogger(),
        definitions,
        allowReadingInvalidState: true,
      });
      const task = taskManagerMock.createTask({ stateVersion: 1, state: { foo: true } });
      const result = taskValidator.getValidatedTaskInstanceFromReading(task);
      expect(result.state).toEqual({ foo: true });
    });

    it(`should remove unknown fields`, () => {
      const definitions = new TaskTypeDictionary(mockLogger());
      definitions.registerTaskDefinitions({
        foo: {
          ...fooTaskDefinition,
          stateSchemaByVersion: {
            1: {
              up: (state) => state,
              schema: schema.object({
                foo: schema.string(),
              }),
            },
          },
        },
      });
      const taskValidator = new TaskValidator({
        logger: mockLogger(),
        definitions,
        allowReadingInvalidState: false,
      });
      const task = taskManagerMock.createTask({
        stateVersion: 1,
        state: { foo: 'foo', bar: 'bar' },
      });
      const result = taskValidator.getValidatedTaskInstanceFromReading(task);
      expect(result.state).toEqual({ foo: 'foo' });
    });

    it(`should migrate state when reading from a document without stateVersion`, () => {
      const definitions = new TaskTypeDictionary(mockLogger());
      definitions.registerTaskDefinitions({
        foo: {
          ...fooTaskDefinition,
          stateSchemaByVersion: {
            1: {
              up: (state) => ({ ...state, baz: 'baz' }),
              schema: schema.object({
                foo: schema.string(),
                baz: schema.string(),
              }),
            },
          },
        },
      });
      const taskValidator = new TaskValidator({
        logger: mockLogger(),
        definitions,
        allowReadingInvalidState: false,
      });
      const task = taskManagerMock.createTask({ stateVersion: undefined, state: { foo: 'foo' } });
      const result = taskValidator.getValidatedTaskInstanceFromReading(task);
      expect(result.state).toEqual({ foo: 'foo', baz: 'baz' });
    });

    it(`should migrate state when reading from an older version`, () => {
      const definitions = new TaskTypeDictionary(mockLogger());
      definitions.registerTaskDefinitions({
        foo: {
          ...fooTaskDefinition,
          stateSchemaByVersion: {
            1: {
              up: (state) => state,
              schema: schema.object({
                foo: schema.string(),
              }),
            },
            2: {
              up: (state) => ({ ...state, baz: 'baz' }),
              schema: schema.object({
                foo: schema.string(),
                baz: schema.string(),
              }),
            },
          },
        },
      });
      const taskValidator = new TaskValidator({
        logger: mockLogger(),
        definitions,
        allowReadingInvalidState: false,
      });
      const task = taskManagerMock.createTask({ stateVersion: 1, state: { foo: 'foo' } });
      const result = taskValidator.getValidatedTaskInstanceFromReading(task);
      expect(result.state).toEqual({ foo: 'foo', baz: 'baz' });
    });

    it(`should throw during the migration phase if a schema version is missing`, () => {
      const definitions = new TaskTypeDictionary(mockLogger());
      definitions.registerTaskDefinitions({
        foo: {
          ...fooTaskDefinition,
          stateSchemaByVersion: {
            1: {
              up: (state) => state,
              schema: schema.object({
                foo: schema.string(),
              }),
            },
            3: {
              up: (state) => ({ ...state, baz: 'baz' }),
              schema: schema.object({
                foo: schema.string(),
                baz: schema.string(),
              }),
            },
          },
        },
      });
      const taskValidator = new TaskValidator({
        logger: mockLogger(),
        definitions,
        allowReadingInvalidState: false,
      });
      const task = taskManagerMock.createTask({ stateVersion: 1, state: { foo: 'foo' } });
      expect(() =>
        taskValidator.getValidatedTaskInstanceFromReading(task)
      ).toThrowErrorMatchingInlineSnapshot(
        `"[TaskValidator] state schema for foo missing version: 2"`
      );
    });
  });

  describe('getValidatedTaskInstanceForUpdating()', () => {
    it(`should return the task as-is whenever the task definition isn't defined`, () => {
      const definitions = new TaskTypeDictionary(mockLogger());
      const taskValidator = new TaskValidator({
        logger: mockLogger(),
        definitions,
        allowReadingInvalidState: false,
      });
      const task = taskManagerMock.createTask();
      const result = taskValidator.getValidatedTaskInstanceForUpdating(task);
      expect(result).toEqual(task);
    });

    it(`should return the task as-is whenever the validate:false option is passed-in`, () => {
      const definitions = new TaskTypeDictionary(mockLogger());
      definitions.registerTaskDefinitions({
        foo: {
          ...fooTaskDefinition,
          stateSchemaByVersion: {
            1: {
              up: (state) => state,
              schema: schema.object({
                foo: schema.string(),
              }),
            },
          },
        },
      });
      const taskValidator = new TaskValidator({
        logger: mockLogger(),
        definitions,
        allowReadingInvalidState: false,
      });
      const task = taskManagerMock.createTask();
      const result = taskValidator.getValidatedTaskInstanceForUpdating(task, { validate: false });
      expect(result).toEqual(task);
    });

    it(`should return the task with timeoutOverride as-is whenever schedule is not defined and override is valid`, () => {
      const definitions = new TaskTypeDictionary(mockLogger());
      const taskValidator = new TaskValidator({
        logger: mockLogger(),
        definitions,
        allowReadingInvalidState: false,
      });
      const task = taskManagerMock.createTask({ timeoutOverride: '1s' });
      const result = taskValidator.getValidatedTaskInstanceForUpdating(task);
      expect(result).toEqual(task);
    });

    it(`should return the task with timeoutOverride stripped whenever schedule and override are defined`, () => {
      const definitions = new TaskTypeDictionary(mockLogger());
      const taskValidator = new TaskValidator({
        logger: mockLogger(),
        definitions,
        allowReadingInvalidState: false,
      });
      const task = taskManagerMock.createTask({
        schedule: { interval: '1d' },
        timeoutOverride: '1s',
      });
      const { timeoutOverride, ...taskWithoutOverride } = task;
      const result = taskValidator.getValidatedTaskInstanceForUpdating(task);
      expect(result).toEqual(taskWithoutOverride);
    });

    it(`should return the task with timeoutOverride stripped whenever override is invalid`, () => {
      const definitions = new TaskTypeDictionary(mockLogger());
      const taskValidator = new TaskValidator({
        logger: mockLogger(),
        definitions,
        allowReadingInvalidState: false,
      });
      const task = taskManagerMock.createTask({
        timeoutOverride: 'foo',
      });
      const { timeoutOverride, ...taskWithoutOverride } = task;
      const result = taskValidator.getValidatedTaskInstanceForUpdating(task);
      expect(result).toEqual(taskWithoutOverride);
    });

    // TODO: Remove skip once all task types have defined their state schema.
    // https://github.com/elastic/kibana/issues/159347
    it.skip(`should fail to validate the state schema when the task type doesn't have stateSchemaByVersion defined`, () => {
      const definitions = new TaskTypeDictionary(mockLogger());
      definitions.registerTaskDefinitions({
        foo: fooTaskDefinition,
      });
      const taskValidator = new TaskValidator({
        logger: mockLogger(),
        definitions,
        allowReadingInvalidState: false,
      });
      const task = taskManagerMock.createTask({ state: { foo: 'bar' } });
      expect(() =>
        taskValidator.getValidatedTaskInstanceForUpdating(task)
      ).toThrowErrorMatchingInlineSnapshot(
        `"[TaskValidator] stateSchemaByVersion not defined for task type: foo"`
      );
    });

    it(`should validate the state schema`, () => {
      const definitions = new TaskTypeDictionary(mockLogger());
      definitions.registerTaskDefinitions({
        foo: {
          ...fooTaskDefinition,
          stateSchemaByVersion: {
            1: {
              up: (state) => state,
              schema: schema.object({
                foo: schema.string(),
              }),
            },
          },
        },
      });
      const taskValidator = new TaskValidator({
        logger: mockLogger(),
        definitions,
        allowReadingInvalidState: false,
      });
      const task = taskManagerMock.createTask({ state: { foo: 'bar' } });
      const { stateVersion, ...result } = taskValidator.getValidatedTaskInstanceForUpdating(task);
      expect(result).toEqual(task);
      expect(stateVersion).toEqual(1);
    });

    it(`should fail to validate the state schema when unknown fields are present`, () => {
      const definitions = new TaskTypeDictionary(mockLogger());
      definitions.registerTaskDefinitions({
        foo: {
          ...fooTaskDefinition,
          stateSchemaByVersion: {
            1: {
              up: (state) => state,
              schema: schema.object({
                foo: schema.string(),
              }),
            },
          },
        },
      });
      const taskValidator = new TaskValidator({
        logger: mockLogger(),
        definitions,
        allowReadingInvalidState: false,
      });
      const task = taskManagerMock.createTask({ state: { foo: 'foo', bar: 'bar' } });
      expect(() =>
        taskValidator.getValidatedTaskInstanceForUpdating(task)
      ).toThrowErrorMatchingInlineSnapshot(`"[bar]: definition for this key is missing"`);
    });
  });

  describe('validateTimeoutOverride()', () => {
    it(`should validate when specifying a valid timeout override field with no schedule`, () => {
      const definitions = new TaskTypeDictionary(mockLogger());
      const taskValidator = new TaskValidator({
        logger: mockLogger(),
        definitions,
        allowReadingInvalidState: false,
      });
      const task = taskManagerMock.createTask({
        timeoutOverride: '1s',
        state: { foo: 'foo' },
      });
      expect(taskValidator.validateTimeoutOverride(task)).toEqual(task);
    });

    it(`should validate when specifying a schedule and no timeout override`, () => {
      const definitions = new TaskTypeDictionary(mockLogger());
      const taskValidator = new TaskValidator({
        logger: mockLogger(),
        definitions,
        allowReadingInvalidState: false,
      });
      const task = taskManagerMock.createTask({
        schedule: { interval: '1d' },
        state: { foo: 'foo' },
      });
      expect(taskValidator.validateTimeoutOverride(task)).toEqual(task);
    });

    it(`should fail to validate when specifying a valid timeout override field and recurring schedule`, () => {
      const definitions = new TaskTypeDictionary(mockLogger());
      const logger = mockLogger();
      const taskValidator = new TaskValidator({
        logger,
        definitions,
        allowReadingInvalidState: false,
      });
      const task = taskManagerMock.createTask({
        timeoutOverride: '1s',
        schedule: { interval: '1d' },
        state: { foo: 'foo' },
      });

      const { timeoutOverride, ...taskWithoutOverride } = task;
      expect(taskValidator.validateTimeoutOverride(task)).toEqual(taskWithoutOverride);
      expect(logger.warn).toHaveBeenCalledWith(
        `[TaskValidator] cannot specify timeout override 1s when scheduling a recurring task`
      );
    });

    it(`should fail to validate when specifying an invalid timeout override field`, () => {
      const definitions = new TaskTypeDictionary(mockLogger());
      const logger = mockLogger();
      const taskValidator = new TaskValidator({
        logger,
        definitions,
        allowReadingInvalidState: false,
      });
      const task = taskManagerMock.createTask({
        timeoutOverride: 'foo',
        state: { foo: 'foo' },
      });
      const { timeoutOverride, ...taskWithoutOverride } = task;
      expect(taskValidator.validateTimeoutOverride(task)).toEqual(taskWithoutOverride);
      expect(logger.warn).toHaveBeenCalledWith(
        `[TaskValidator] Invalid timeout override "foo". Timeout must be of the form "{number}{cadence}" where number is an integer. Example: 5m. This timeout override will be ignored.`
      );
    });
  });
});
