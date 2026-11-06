/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CaseTask } from '../../../../common/types/domain/task/v1';
import { renderWithTestingProviders } from '../../../common/mock';
import { useUpdateTask } from '../../../containers/use_case_tasks';
import { CloseCaseModal } from './close_case_modal';
import {
  REQUIRED_TASKS_MISSING,
  RequiredTasksCallout,
  isOpenRequiredTask,
} from './required_tasks_callout';

jest.mock('../../../containers/use_case_tasks');

const updateTask = jest.fn();
(useUpdateTask as jest.Mock).mockReturnValue({ mutate: updateTask, isLoading: false });

const task = (overrides: Partial<CaseTask>): CaseTask =>
  ({
    id: 'task-1',
    version: 'v1',
    title: 'Record the outcome',
    status: 'open',
    required: true,
    ...overrides,
  } as CaseTask);

describe('RequiredTasksCallout', () => {
  beforeEach(() => jest.clearAllMocks());

  it('keeps only required tasks that are still open', () => {
    expect(
      [
        task({ id: 'a' }),
        task({ id: 'b', status: 'completed' }),
        task({ id: 'c', status: 'cancelled' }),
        task({ id: 'd', required: false }),
        task({ id: 'e', status: 'in_progress' }),
      ]
        .filter(isOpenRequiredTask)
        .map(({ id }) => id)
    ).toEqual(['a', 'e']);
  });

  it('names the open required tasks and marks one done in place', async () => {
    renderWithTestingProviders(
      <RequiredTasksCallout caseId="case-1" tasks={[task({})]} canUpdate={true} />
    );

    expect(screen.getByTestId('close-case-modal-required-tasks')).toHaveTextContent(
      '1 required task is open'
    );
    await userEvent.click(screen.getByTestId('close-case-modal-mark-done-task-1'));
    expect(updateTask).toHaveBeenCalledWith({
      taskId: 'task-1',
      request: { version: 'v1', status: 'completed' },
    });
  });

  it('disables Close case while required tasks are open', () => {
    renderWithTestingProviders(
      <CloseCaseModal
        closeReasonOptions={[]}
        onClose={jest.fn()}
        onSubmit={jest.fn()}
        onCloseReasonOptionsChange={jest.fn()}
        confirmDisabledReason={REQUIRED_TASKS_MISSING(2)}
      />
    );

    expect(screen.getByTestId('close-case-modal-confirm')).toBeDisabled();
  });
});
