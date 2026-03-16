/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverTitle,
  EuiSpacer,
  EuiSwitch,
  EuiText,
} from '@elastic/eui';
import type { CaseTask } from '../../../common/types/domain/task/v1';
import type { CaseUI } from '../../../common/ui/types';
import { CASE_VIEW_PAGE_TABS } from '../../../common/types';
import { useGetTasks } from '../../containers/use_get_tasks';
import { CaseViewTabs } from '../case_view/case_view_tabs';
import { TasksTable } from './tasks_table';
import { TasksBoard } from './tasks_board';
import { AddTaskFlyout } from './add_task_flyout';
import { EditTaskFlyout } from './edit_task_flyout';
import { ApplyTemplateModal } from './apply_template_modal';
import { useTaskStatuses } from './use_task_statuses';
import * as i18n from './translations';

interface CaseViewTasksProps {
  caseData: CaseUI;
  searchTerm?: string;
}

interface AddTaskState {
  open: boolean;
  parentTask: CaseTask | null;
}

const VIEW_TOGGLE_OPTIONS = [
  { id: 'list', label: i18n.VIEW_LIST, iconType: 'list' },
  { id: 'board', label: i18n.VIEW_BOARD, iconType: 'visTable' },
];

export const CaseViewTasks = React.memo<CaseViewTasksProps>(({ caseData, searchTerm }) => {
  const caseId = caseData.id;
  const { data, isLoading } = useGetTasks(caseId);
  const allStatuses = useTaskStatuses();

  const [addState, setAddState] = useState<AddTaskState>({ open: false, parentTask: null });
  const [editingTask, setEditingTask] = useState<CaseTask | null>(null);
  const [applyTemplateOpen, setApplyTemplateOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const [columnPopoverOpen, setColumnPopoverOpen] = useState(false);
  const [hiddenStatuses, setHiddenStatuses] = useState<Set<string>>(new Set());

  const visibleStatuses = useMemo(
    () =>
      hiddenStatuses.size === 0
        ? undefined
        : new Set(allStatuses.filter((s) => !hiddenStatuses.has(s.key)).map((s) => s.key)),
    [allStatuses, hiddenStatuses]
  );

  const toggleStatus = (key: string) => {
    setHiddenStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const hasTasks = (data?.tasks.length ?? 0) > 0 || isLoading;

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem>
          <CaseViewTabs
            caseData={caseData}
            activeTab={CASE_VIEW_PAGE_TABS.TASKS}
            searchTerm={searchTerm}
          />

          {/* Single unified toolbar: actions left, view toggle right */}
          {hasTasks && (
            <>
              <EuiSpacer size="s" />
              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    size="s"
                    iconType="plus"
                    onClick={() => setAddState({ open: true, parentTask: null })}
                    data-test-subj="cases-tasks-add-task"
                  >
                    {i18n.ADD_TASK}
                  </EuiButton>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    size="s"
                    iconType="documents"
                    onClick={() => setApplyTemplateOpen(true)}
                    data-test-subj="cases-tasks-apply-template"
                  >
                    {i18n.APPLY_TEMPLATE}
                  </EuiButtonEmpty>
                </EuiFlexItem>

                {/* spacer pushes view toggle to the right */}
                <EuiFlexItem />

                {viewMode === 'board' && (
                  <EuiFlexItem grow={false}>
                    <EuiPopover
                      isOpen={columnPopoverOpen}
                      closePopover={() => setColumnPopoverOpen(false)}
                      panelPaddingSize="none"
                      button={
                        <EuiButtonEmpty
                          size="s"
                          iconType="controlsVertical"
                          onClick={() => setColumnPopoverOpen((o) => !o)}
                          data-test-subj="cases-tasks-column-toggle"
                        >
                          {i18n.COLUMNS}
                        </EuiButtonEmpty>
                      }
                    >
                      <EuiPopoverTitle>{i18n.VISIBLE_COLUMNS}</EuiPopoverTitle>
                      <div style={{ padding: '4px 16px 12px', minWidth: 180 }}>
                        {allStatuses.map(({ key, label }) => (
                          <EuiFlexGroup
                            key={key}
                            alignItems="center"
                            justifyContent="spaceBetween"
                            gutterSize="m"
                            responsive={false}
                            style={{ paddingTop: 10, paddingBottom: 2 }}
                          >
                            <EuiFlexItem>
                              <EuiText size="s">{label}</EuiText>
                            </EuiFlexItem>
                            <EuiFlexItem grow={false}>
                              <EuiSwitch
                                label=""
                                showLabel={false}
                                checked={!hiddenStatuses.has(key)}
                                onChange={() => toggleStatus(key)}
                                compressed
                                data-test-subj={`cases-tasks-col-toggle-${key}`}
                              />
                            </EuiFlexItem>
                          </EuiFlexGroup>
                        ))}
                      </div>
                    </EuiPopover>
                  </EuiFlexItem>
                )}

                <EuiFlexItem grow={false}>
                  <EuiButtonGroup
                    legend="Task view mode"
                    options={VIEW_TOGGLE_OPTIONS}
                    idSelected={viewMode}
                    onChange={(id) => setViewMode(id as 'list' | 'board')}
                    buttonSize="s"
                    isIconOnly
                    data-test-subj="cases-tasks-view-toggle"
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="s" />
            </>
          )}

          {viewMode === 'list' ? (
            <TasksTable
              caseId={caseId}
              tasks={data?.tasks ?? []}
              isLoading={isLoading}
              onAddTask={() => setAddState({ open: true, parentTask: null })}
              onEditTask={(task) => setEditingTask(task)}
              onAddSubTask={(parentTask) => setAddState({ open: true, parentTask })}
              onApplyTemplate={() => setApplyTemplateOpen(true)}
            />
          ) : (
            <TasksBoard
              caseId={caseId}
              tasks={data?.tasks ?? []}
              onEditTask={(task) => setEditingTask(task)}
              visibleStatuses={visibleStatuses}
            />
          )}
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

      {applyTemplateOpen && (
        <ApplyTemplateModal
          caseId={caseId}
          onClose={() => setApplyTemplateOpen(false)}
        />
      )}
    </>
  );
});

CaseViewTasks.displayName = 'CaseViewTasks';
