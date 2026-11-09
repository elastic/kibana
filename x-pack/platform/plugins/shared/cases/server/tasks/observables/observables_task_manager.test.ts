/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import type { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';
import { deleteObservablesOfCases } from '../../services/observables/delete_for_cases';
import { ObservablesTaskManager } from './observables_task_manager';
import { CASES_OBSERVABLES_DELETE_TASK_TYPE } from './constants';

jest.mock('../../services/observables/delete_for_cases');

const deleteObservablesOfCasesMock = deleteObservablesOfCases as jest.MockedFunction<
  typeof deleteObservablesOfCases
>;

describe('ObservablesTaskManager', () => {
  const logger = loggingSystemMock.createLogger();

  const setup = () => {
    const taskManagerSetup = taskManagerMock.createSetup();
    const taskManagerStart = taskManagerMock.createStart();
    const manager = new ObservablesTaskManager(taskManagerSetup, logger);
    manager.start(taskManagerStart, coreMock.createStart());

    const [[definitions]] = taskManagerSetup.registerTaskDefinitions.mock.calls;
    const runTask = (params: unknown) =>
      definitions[CASES_OBSERVABLES_DELETE_TASK_TYPE].createTaskRunner({
        taskInstance: { id: 'task-1', params } as unknown as ConcreteTaskInstance,
      } as Parameters<(typeof definitions)[typeof CASES_OBSERVABLES_DELETE_TASK_TYPE]['createTaskRunner']>[0]).run();

    return { manager, taskManagerStart, runTask };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    deleteObservablesOfCasesMock.mockResolvedValue(3);
  });

  it('schedules a delete with the cases and their namespace', async () => {
    const { manager, taskManagerStart } = setup();

    await manager.scheduleCaseObservablesDeletion({ caseIds: ['case-1'], namespace: 'space-1' });

    expect(taskManagerStart.schedule).toHaveBeenCalledWith({
      taskType: CASES_OBSERVABLES_DELETE_TASK_TYPE,
      params: { caseIds: ['case-1'], namespace: 'space-1' },
      state: {},
      scope: ['cases'],
    });
  });

  it('deletes the observables of the cases with the internal client', async () => {
    const { runTask } = setup();

    await runTask({ caseIds: ['case-1', 'case-2'], namespace: 'space-1' });

    expect(deleteObservablesOfCasesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        caseIds: ['case-1', 'case-2'],
        namespace: 'space-1',
        isInternalClient: true,
      })
    );
    expect(logger.get().info).toHaveBeenCalledWith('Deleted 3 observables of 2 deleted case(s)');
  });

  it('logs and rethrows a failure so Task Manager retries', async () => {
    deleteObservablesOfCasesMock.mockRejectedValue(new Error('boom'));
    const { runTask } = setup();

    await expect(runTask({ caseIds: ['case-1'], namespace: 'default' })).rejects.toThrow('boom');
    expect(logger.get().error).toHaveBeenCalledWith(
      'Failed to delete the observables of cases [case-1]: boom'
    );
  });

  it('skips a task with invalid params', async () => {
    const { runTask } = setup();

    await runTask({ caseIds: 'case-1' });

    expect(deleteObservablesOfCasesMock).not.toHaveBeenCalled();
  });
});
