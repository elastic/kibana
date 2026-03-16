/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useGetTasks } from '../../containers/use_get_tasks';
import { TasksTable } from './tasks_table';

interface CaseViewTasksProps {
  caseId: string;
}

export const CaseViewTasks = React.memo<CaseViewTasksProps>(({ caseId }) => {
  const { data, isLoading } = useGetTasks(caseId);

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <TasksTable
          caseId={caseId}
          tasks={data?.tasks ?? []}
          isLoading={isLoading}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

CaseViewTasks.displayName = 'CaseViewTasks';
