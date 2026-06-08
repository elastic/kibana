/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';

import {
  getTaskCostFromInstance,
  getDeleteTaskRunResult,
  isFailedRunResult,
  taskDefinitionSchema,
  TaskCost,
  InstanceTaskCost,
  TaskPriority,
} from './task';

type TaskDefinition = TypeOf<typeof taskDefinitionSchema>;

describe('task', () => {
  describe('getTaskCostFromInstance()', () => {
    it(`should return the relevant value from existing constants`, () => {
      expect(getTaskCostFromInstance(InstanceTaskCost.Tiny)).toBe(TaskCost.Tiny);
      expect(getTaskCostFromInstance(InstanceTaskCost.Normal)).toBe(TaskCost.Normal);
      expect(getTaskCostFromInstance(InstanceTaskCost.Large)).toBe(TaskCost.Large);
      expect(getTaskCostFromInstance(InstanceTaskCost.ExtraLarge)).toBe(TaskCost.ExtraLarge);
    });

    it(`should return undefined for no parameter`, () => {
      expect(getTaskCostFromInstance()).toBeUndefined();
      expect(getTaskCostFromInstance(undefined)).toBeUndefined();
    });

    it(`should return undefined for unexpected parameter`, () => {
      expect(getTaskCostFromInstance('NOPE' as InstanceTaskCost)).toBeUndefined();
    });
  });

  describe('getDeleteTaskRunResult()', () => {
    it('should return expected values', () => {
      expect(getDeleteTaskRunResult()).toEqual({
        state: {},
        shouldDeleteTask: true,
      });
    });
  });

  describe('isFailedRunResult()', () => {
    it('should return false when passed undefined/null', () => {
      expect(isFailedRunResult(undefined)).toBe(false);
      expect(isFailedRunResult(null)).toBe(false);
    });

    it('should return false when passed an object without error property', () => {
      expect(isFailedRunResult({})).toBe(false);
      expect(isFailedRunResult({ state: {} })).toBe(false);
    });

    it('should return true when passed an object with error property', () => {
      expect(isFailedRunResult({ error: {} })).toBe(true);
    });
  });

  describe('taskDefinitionSchema custom validation', () => {
    const v = taskDefinitionSchema.validate.bind(taskDefinitionSchema);
    const taskDef: TaskDefinition = {
      type: 'test',
      cost: TaskCost.Tiny,
      timeout: '1m',
    };

    describe('timeout', () => {
      it('handles proper intervals', () => {
        expect(() => v({ ...taskDef, timeout: '1s' })).not.toThrow();
        expect(() => v({ ...taskDef, timeout: '20m' })).not.toThrow();
        expect(() => v({ ...taskDef, timeout: '300h' })).not.toThrow();
        expect(() => v({ ...taskDef, timeout: '4000d' })).not.toThrow();
      });

      it('throws errors on invalid intervals', () => {
        expect(() => v({ ...taskDef, timeout: 'invalid' })).toThrow('Invalid timeout');
        expect(() => v({ ...taskDef, timeout: '5000' })).toThrow('Invalid timeout');
        expect(() => v({ ...taskDef, timeout: 'd' })).toThrow('Invalid timeout');
        expect(() => v({ ...taskDef, timeout: '-3m' })).toThrow('Invalid timeout');
      });
    });

    describe('priority', () => {
      it('handles proper values', () => {
        expect(() => v(taskDef)).not.toThrow();
        expect(() => v({ ...taskDef, priority: TaskPriority.Low })).not.toThrow();
        expect(() => v({ ...taskDef, priority: TaskPriority.NormalLongRunning })).not.toThrow();
        expect(() => v({ ...taskDef, priority: TaskPriority.Normal })).not.toThrow();
      });

      it('throws errors on invalid values', () => {
        expect(() => v({ ...taskDef, priority: 'x' })).toThrow('[priority]');
        expect(() => v({ ...taskDef, priority: 2 })).toThrow('Invalid priority');
      });
    });

    describe('cost', () => {
      it('handles proper values', () => {
        expect(() => v({ ...taskDef, cost: TaskCost.Tiny })).not.toThrow();
        expect(() => v({ ...taskDef, cost: TaskCost.Normal })).not.toThrow();
        expect(() => v({ ...taskDef, cost: TaskCost.Large })).not.toThrow();
        expect(() => v({ ...taskDef, cost: TaskCost.ExtraLarge })).not.toThrow();
      });

      it('throws errors on invalid values', () => {
        expect(() => v({ ...taskDef, cost: 'Nope' })).toThrow('[cost]');
        expect(() => v({ ...taskDef, cost: 8 })).toThrow('Invalid cost');
      });
    });
  });
});
