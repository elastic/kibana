/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { CaseTask } from '../../../common/types/domain/task/v1';
import type { CaseUI } from '../../../common/ui/types';
import { CASE_VIEW_PAGE_TABS } from '../../../common/types';
import { useGetTasks } from '../../containers/use_get_tasks';
import { CaseViewTabs } from '../case_view/case_view_tabs';
import { TasksTable } from './tasks_table';
import { AddTaskFlyout } from './add_task_flyout';
import { EditTaskFlyout } from './edit_task_flyout';

interface CaseViewTasksProps {
  caseData: CaseUI;
  searchTerm?: string;
}

interface AddTaskState {
  open: boolean;
  parentTask: CaseTask | null;
}

export const CaseViewTasks = React.memo<CaseViewTasksProps>(({ caseData, searchTerm }) => {
  const caseId = caseData.id;
  const { data, isLoading } = useGetTasks(caseId);

  const [addState, setAddState] = useState<AddTaskState>({ open: false, parentTask: null });
  const [editingTask, setEditingTask] = useState<CaseTask | null>(null);

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem>
          <CaseViewTabs
            caseData={caseData}
            activeTab={CASE_VIEW_PAGE_TABS.TASKS}
            searchTerm={searchTerm}
          />
          <EuiFlexGroup>
            <EuiFlexItem>
              <TasksTable
                caseId={caseId}
                tasks={data?.tasks ?? []}
                isLoading={isLoading}
                onAddTask={() => setAddState({ open: true, parentTask: null })}
                onEditTask={(task) => setEditingTask(task)}
                onAddSubTask={(parentTask) => setAddState({ open: true, parentTask })}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      {addState.open && (
        <AddTaskFlyout
          caseId={caseId}
          parentTaskId={addState.parentTask?.id ?? null}
          parentTaskTitle={addState.parentTask?.title}
          onClose={() => setAddState({ open: false, parentTask: null })}
        />
      )}

      {editingTask && (
        <EditTaskFlyout
          caseId={caseId}
          task={editingTask}
          onClose={() => setEditingTask(null)}
        />
      )}
    </>
  );
});

CaseViewTasks.displayName = 'CaseViewTasks';
