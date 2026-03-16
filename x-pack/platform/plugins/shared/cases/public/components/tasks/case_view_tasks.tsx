/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useGetTasks } from '../../containers/use_get_tasks';
import { TasksTable } from './tasks_table';
import { AddTaskFlyout } from './add_task_flyout';

interface CaseViewTasksProps {
  caseId: string;
}

export const CaseViewTasks = React.memo<CaseViewTasksProps>(({ caseId }) => {
  const { data, isLoading } = useGetTasks(caseId);
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem>
          <TasksTable
            caseId={caseId}
            tasks={data?.tasks ?? []}
            isLoading={isLoading}
            onAddTask={() => setIsFlyoutOpen(true)}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      {isFlyoutOpen && (
        <AddTaskFlyout caseId={caseId} onClose={() => setIsFlyoutOpen(false)} />
      )}
    </>
  );
});

CaseViewTasks.displayName = 'CaseViewTasks';
