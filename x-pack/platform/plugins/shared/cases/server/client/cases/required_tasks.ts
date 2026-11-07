/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { CaseStatuses } from '../../../common/types/domain';
import type { CasesClientArgs } from '../types';
import { settleRunningTaskWorkflows } from '../tasks/task_workflow';

type RequiredTasksClientArgs = CasesClientArgs;

const getOpenRequiredTaskTitles = async (
  caseId: string,
  clientArgs: RequiredTasksClientArgs
): Promise<string[]> => {
  const { tasks } = await clientArgs.services.taskService.findTasks({
    caseIds: [caseId],
    status: ['open', 'in_progress'],
  });
  // A required task whose workflow already succeeded completes here, not only when a browser
  // polls, so the close sees the outcome.
  const settled = await settleRunningTaskWorkflows(
    clientArgs,
    tasks.filter(({ required }) => required)
  );
  return settled
    .filter(({ status }) => status === 'open' || status === 'in_progress')
    .map(({ title }) => title);
};

/** For paths that close a case as a side effect (close by pushing) and must not fail. */
export const hasOpenRequiredTasks = async ({
  caseId,
  clientArgs,
}: {
  caseId: string;
  clientArgs: RequiredTasksClientArgs;
}): Promise<boolean> => {
  if (
    !clientArgs.config.tasks.enabled ||
    !(await clientArgs.services.licensingService.isAtLeastPlatinum())
  ) {
    return false;
  }
  return (await getOpenRequiredTaskTitles(caseId, clientArgs)).length > 0;
};

interface ClosingCandidate {
  updateReq: { id: string; status?: string };
  originalCase: { id: string; attributes: { status: string; title: string } };
}

/**
 * Refuses to close a case while one of its required tasks is still open or in progress. A custom
 * status key has already been resolved to its category by now, so closing through a custom closed
 * status is caught too. Without tasks (flag off or below Platinum) nothing is checked.
 */
export const throwIfClosingWithOpenRequiredTasks = async ({
  casesToUpdate,
  clientArgs,
  hasPlatinumLicense,
}: {
  casesToUpdate: ClosingCandidate[];
  clientArgs: RequiredTasksClientArgs;
  hasPlatinumLicense: boolean;
}): Promise<void> => {
  if (!clientArgs.config.tasks.enabled || !hasPlatinumLicense) {
    return;
  }

  const closing = casesToUpdate.filter(
    ({ updateReq, originalCase }) =>
      updateReq.status === CaseStatuses.closed &&
      originalCase.attributes.status !== CaseStatuses.closed
  );

  await Promise.all(
    closing.map(async ({ originalCase }) => {
      const titles = await getOpenRequiredTaskTitles(originalCase.id, clientArgs);
      if (titles.length > 0) {
        throw Boom.badRequest(
          `Finish the required tasks before closing the case "${
            originalCase.attributes.title
          }": ${titles.join(', ')}.`
        );
      }
    })
  );
};
