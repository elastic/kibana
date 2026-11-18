/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { metrics } from '@opentelemetry/api';
import { v4 as uuidv4 } from 'uuid';
import type { ConcreteTaskInstance } from '../task';
import { TaskCost, TaskStatus } from '../task';
import { asTaskClaimEvent, asTaskRunEvent, TaskPersistence } from '../task_events';
import { asErr, asOk } from '../lib/result_type';
import { TaskRunResult } from '../task_running';
import { TaskTypeDictionary } from '../task_type_dictionary';
import { mockLogger } from '../test_utils';
import { recordSlotTime, TaskManagerCapacityMetrics } from './capacity_telemetry';

const mockAdd = jest.fn();
jest.mock('@opentelemetry/api', () => {
  const meter = {
    createCounter: () => ({ add: (...args: unknown[]) => mockAdd(...args) }),
    createObservableGauge: (name: string) => ({ name }),
    addBatchObservableCallback: jest.fn(),
    removeBatchObservableCallback: jest.fn(),
  };
  return { ...jest.requireActual('@opentelemetry/api'), metrics: { getMeter: () => meter } };
});

describe('TaskManagerCapacityMetrics', () => {
  const meter = metrics.getMeter('kibana.task_manager');
  const addCallback = meter.addBatchObservableCallback as jest.Mock;
  const removeCallback = meter.removeBatchObservableCallback as jest.Mock;

  const observedBy = (callback: (result: { observe: jest.Mock }) => void) => {
    const result = { observe: jest.fn() };
    callback(result);
    return result.observe.mock.calls.map(([gauge, value]) => [gauge.name, value]);
  };

  const providers = (configured: number, effective: number, occupied: number) => ({
    getConfiguredCapacity: () => configured,
    getEffectiveCapacity: () => effective,
    getOccupiedCost: () => occupied,
  });

  beforeEach(() => {
    addCallback.mockClear();
    removeCallback.mockClear();
  });

  test('observes its own providers', () => {
    const first = new TaskManagerCapacityMetrics(providers(20, 16, 6));
    const second = new TaskManagerCapacityMetrics(providers(40, 40, 0));

    expect(observedBy(addCallback.mock.calls[0][0])).toEqual([
      ['kibana.task_manager.capacity.configured', 20],
      ['kibana.task_manager.capacity.effective', 16],
      ['kibana.task_manager.capacity.occupied_cost', 6],
    ]);
    expect(observedBy(addCallback.mock.calls[1][0])).toEqual([
      ['kibana.task_manager.capacity.configured', 40],
      ['kibana.task_manager.capacity.effective', 40],
      ['kibana.task_manager.capacity.occupied_cost', 0],
    ]);
    first.stop();
    second.stop();
  });

  test('stop removes the callback it registered', () => {
    const capacityMetrics = new TaskManagerCapacityMetrics(providers(20, 20, 0));
    const [callback, gauges] = addCallback.mock.calls[0];

    capacityMetrics.stop();

    expect(removeCallback).toHaveBeenCalledTimes(1);
    expect(removeCallback).toHaveBeenCalledWith(callback, gauges);
  });
});

describe('recordSlotTime', () => {
  const definitions = new TaskTypeDictionary(mockLogger());
  definitions.registerTaskDefinitions({
    normalTask: { title: 'normalTask', createTaskRunner: jest.fn() },
    largeTask: { title: 'largeTask', cost: TaskCost.Large, createTaskRunner: jest.fn() },
  });

  const timing = { start: 0, stop: 5000 };

  beforeEach(() => mockAdd.mockClear());

  const mockTask = (taskType: string, cost?: ConcreteTaskInstance['cost']) =>
    ({
      id: uuidv4(),
      attempts: 0,
      status: TaskStatus.Running,
      version: '123',
      runAt: new Date(),
      scheduledAt: new Date(),
      startedAt: new Date(),
      retryAt: null,
      state: {},
      taskType,
      params: {},
      ownerId: null,
      traceparent: '',
      cost,
    } as ConcreteTaskInstance);

  const ranTask = (task: ConcreteTaskInstance) => ({
    task,
    persistence: TaskPersistence.NonRecurring,
    result: TaskRunResult.Success,
    isExpired: false,
  });

  test('a normal task adds its duration in ms', () => {
    const task = mockTask('normalTask');
    recordSlotTime(asTaskRunEvent(task.id, asOk(ranTask(task)), timing), definitions);

    expect(mockAdd).toHaveBeenCalledTimes(1);
    expect(mockAdd).toHaveBeenCalledWith(5000, { 'task.type': 'normalTask' });
  });

  test('a large task adds twice its duration in ms', () => {
    const task = mockTask('largeTask');
    recordSlotTime(asTaskRunEvent(task.id, asOk(ranTask(task)), timing), definitions);

    expect(mockAdd).toHaveBeenCalledWith(10000, { 'task.type': 'largeTask' });
  });

  test('a per-instance cost overrides the definition cost', () => {
    const task = mockTask('normalTask', TaskCost.Tiny);
    recordSlotTime(asTaskRunEvent(task.id, asOk(ranTask(task)), timing), definitions);

    expect(mockAdd).toHaveBeenCalledWith(2500, { 'task.type': 'normalTask' });
  });

  test('failed runs are counted', () => {
    const task = mockTask('largeTask');
    recordSlotTime(
      asTaskRunEvent(task.id, asErr({ ...ranTask(task), error: new Error('boom') }), timing),
      definitions
    );

    expect(mockAdd).toHaveBeenCalledWith(10000, { 'task.type': 'largeTask' });
  });

  test('task run events without timing are ignored', () => {
    const task = mockTask('normalTask');
    recordSlotTime(asTaskRunEvent(task.id, asOk(ranTask(task))), definitions);

    expect(mockAdd).not.toHaveBeenCalled();
  });

  test('other event types are ignored', () => {
    const task = mockTask('normalTask');
    recordSlotTime(asTaskClaimEvent(task.id, asOk(task), timing), definitions);

    expect(mockAdd).not.toHaveBeenCalled();
  });
});
