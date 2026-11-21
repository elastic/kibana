/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiProgress,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useQueryClient } from '@kbn/react-query';
import { INVESTIGATION_AGENT_ID } from '../../../../common/investigations/types';
import type { ItemPatch, TaskItem, TaskOwnerType } from '../../../../common/investigations/types';
import {
  useInvestigationToasts,
  useInvestigationTypes,
  useProcedureTemplates,
  useUpdateItem,
} from '../../hooks';
import { investigationKeys } from '../../api/query_keys';
import { ICONS } from '../../icons';
import { useInvestigationsServices } from '../../services';
import { converse } from '../conversation/conversation_api';
import { EmptyState, ErrorState, LoadingState } from '../shared';
import { isTaskItem, useAllItems } from '../scope/use_all_items';
import { useItemsByIds } from '../scope/use_items_by_ids';
import type { TabProps } from '../tabs/tab_props';
import { ApplyProcedureModal } from './apply_procedure_modal';
import {
  MAX_TASKS,
  OWNER_TYPES,
  OWNER_TYPE_LABELS,
  PHASES,
  getEffectiveStatus,
  isOwnedBy,
  isTaskFinished,
  isTaskUnassigned,
  personOwner,
  sortTasks,
  useCurrentUser,
} from './procedure_helpers';
import type { TaskFilter } from './procedure_helpers';
import { SkipModal } from './skip_modal';
import { TaskRow } from './task_row';
import { TemplateEditor } from './template_editor';
import * as i18n from './translations';

type Owner = TaskItem['task']['owner'];

const HIGHLIGHT_MS = 3500;

export const ProcedurePanel: React.FC<TabProps> = ({
  record,
  agentAvailable,
  openItemId,
  onNavigateTab,
  onOpenModal,
}) => {
  const recordId = record.id;
  const { euiTheme } = useEuiTheme();
  const { showSuccess, showError } = useInvestigationToasts();
  const { http } = useInvestigationsServices();
  const queryClient = useQueryClient();
  const currentUser = useCurrentUser();
  const tasksQuery = useAllItems(recordId, 'task', isTaskItem, MAX_TASKS);
  const templatesQuery = useProcedureTemplates();
  const typesQuery = useInvestigationTypes();
  const updateItem = useUpdateItem(recordId);

  const [filter, setFilter] = useState<TaskFilter>('all');
  const [ownerFilter, setOwnerFilter] = useState<TaskOwnerType | 'any'>('any');
  const [skipTask, setSkipTask] = useState<TaskItem | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [applyType, setApplyType] = useState<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [agentRunTaskId, setAgentRunTaskId] = useState<string | null>(null);
  const handledItemIdRef = useRef<string | undefined>(undefined);

  const tasks = useMemo(() => sortTasks(tasksQuery.data?.items ?? []), [tasksQuery.data]);
  const tasksById = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);
  const claimIds = useMemo(
    () =>
      tasks.flatMap((task) =>
        task.task.auto?.type === 'claim' && task.task.auto.claim_id ? [task.task.auto.claim_id] : []
      ),
    [tasks]
  );
  const { itemsById: claimsById } = useItemsByIds(recordId, 'claim', claimIds);

  const typeNames = useMemo(() => {
    const names = new Set<string>();
    if (record.investigation_type) {
      names.add(record.investigation_type);
    }
    templatesQuery.data?.templates.forEach((template) => names.add(template.type));
    return Array.from(names);
  }, [record.investigation_type, templatesQuery.data]);
  const applicableTypeNames = useMemo(() => {
    const names = new Set<string>(typeNames);
    typesQuery.data?.types.forEach((type) => names.add(type.name));
    return Array.from(names);
  }, [typeNames, typesQuery.data]);

  // Scroll to and highlight the task another tab or an activity link points to.
  useEffect(() => {
    if (!openItemId || handledItemIdRef.current === openItemId || !tasksById.has(openItemId)) {
      return;
    }
    handledItemIdRef.current = openItemId;
    setFilter('all');
    setOwnerFilter('any');
    setHighlightedId(openItemId);
    const scrollTimer = setTimeout(() => {
      document
        .getElementById(`investigation-task-${openItemId}`)
        ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 80);
    const clearTimer = setTimeout(() => setHighlightedId(null), HIGHLIGHT_MS);
    return () => {
      clearTimeout(scrollTimer);
      clearTimeout(clearTimer);
    };
  }, [openItemId, tasksById]);

  const patchTask = useCallback(
    (task: TaskItem, patch: ItemPatch, onSuccess?: () => void) =>
      updateItem.mutate({ itemId: task.id, version: task.version ?? '', patch }, { onSuccess }),
    [updateItem]
  );

  const handleToggleDone = (task: TaskItem) => patchTask(task, { status: 'done' });
  const handleStart = (task: TaskItem) =>
    patchTask(task, {
      status: 'doing',
      ...(isTaskUnassigned(task) && currentUser
        ? { task: { owner: personOwner(currentUser) } }
        : {}),
    });
  const conversationId = record.conversation_id;
  const handleRunWithAgent = async (task: TaskItem) => {
    if (!conversationId) {
      return;
    }
    setAgentRunTaskId(task.id);
    const started = await updateItem
      .mutateAsync({ itemId: task.id, version: task.version ?? '', patch: { status: 'doing' } })
      .then(() => true)
      .catch(() => false);
    if (started) {
      try {
        await converse(http, {
          agentId: INVESTIGATION_AGENT_ID,
          conversationId,
          input: i18n.AGENT_RUN_PROMPT(task.ref),
          triggerMode: 'always',
        });
        showSuccess(i18n.RUN_WITH_AGENT_SUCCESS(task.title));
      } catch (error) {
        showError(error, i18n.RUN_WITH_AGENT_ERROR);
      }
    }
    await queryClient.invalidateQueries(investigationKeys.recordScope(recordId));
    setAgentRunTaskId(null);
  };
  const handleReopen = (task: TaskItem) =>
    patchTask(task, { status: 'todo', task: { note: null, skip_reason: null } });
  const handleAssign = (task: TaskItem, owner: Owner) => patchTask(task, { task: { owner } });
  const handleSkip = (reason: string) => {
    if (!skipTask) {
      return;
    }
    const target = skipTask;
    patchTask(target, { status: 'skipped', task: { skip_reason: reason } }, () => {
      showSuccess(i18n.SKIP_SUCCESS(target.title));
      setSkipTask(null);
    });
  };

  if (tasksQuery.isLoading) {
    return <LoadingState label={i18n.LOADING} />;
  }
  if (tasksQuery.error) {
    return (
      <ErrorState
        title={i18n.LOAD_ERROR}
        error={tasksQuery.error}
        onRetry={() => void tasksQuery.refetch()}
      />
    );
  }

  const templates = templatesQuery.data?.templates ?? [];
  const applicable = tasks.filter((task) => task.status !== 'skipped');
  const doneCount = applicable.filter((task) => task.status === 'done').length;
  const requiredLeft = tasks.filter((task) => task.task.required && !isTaskFinished(task)).length;
  const progress = applicable.length > 0 ? Math.round((doneCount / applicable.length) * 100) : 0;

  const counts = {
    all: tasks.length,
    mine: tasks.filter((task) => isOwnedBy(task, currentUser)).length,
    open: tasks.filter((task) => !isTaskFinished(task)).length,
    required: tasks.filter((task) => task.task.required).length,
  };
  const visibleTasks = tasks.filter((task) => {
    if (ownerFilter !== 'any' && task.task.owner.type !== ownerFilter) {
      return false;
    }
    switch (filter) {
      case 'mine':
        return isOwnedBy(task, currentUser);
      case 'open':
        return !isTaskFinished(task);
      case 'required':
        return task.task.required;
      default:
        return true;
    }
  });

  const modals = (
    <>
      {skipTask ? (
        <SkipModal
          task={skipTask}
          isLoading={updateItem.isLoading}
          onConfirm={handleSkip}
          onClose={() => setSkipTask(null)}
        />
      ) : null}
      {isEditorOpen ? (
        <TemplateEditor record={record} tasks={tasks} onClose={() => setIsEditorOpen(false)} />
      ) : null}
      {applyType ? (
        <ApplyProcedureModal
          record={record}
          tasks={tasks}
          templates={templates}
          typeNames={applicableTypeNames}
          initialType={applyType}
          onClose={() => setApplyType(null)}
        />
      ) : null}
    </>
  );

  if (tasks.length === 0) {
    return (
      <div data-test-subj="investigationProcedureTab">
        <EmptyState
          iconType={ICONS.procedure}
          title={i18n.EMPTY_TITLE}
          body={i18n.EMPTY_BODY}
          actions={
            <EuiFlexGroup gutterSize="s" justifyContent="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  onClick={() =>
                    setApplyType(record.investigation_type || applicableTypeNames[0] || '')
                  }
                  data-test-subj="investigationProcedureApply"
                >
                  {i18n.APPLY_PROCEDURE}
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  iconType={ICONS.template}
                  onClick={() => setIsEditorOpen(true)}
                  data-test-subj="investigationProcedureConfigure"
                >
                  {i18n.CONFIGURE}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          }
          data-test-subj="investigationProcedureEmpty"
        />
        {modals}
      </div>
    );
  }

  const filterOptions: Array<{ id: TaskFilter; label: string }> = [
    { id: 'all', label: i18n.FILTER_ALL(counts.all) },
    { id: 'mine', label: i18n.FILTER_MINE(counts.mine) },
    { id: 'open', label: i18n.FILTER_OPEN(counts.open) },
    { id: 'required', label: i18n.FILTER_REQUIRED(counts.required) },
  ];

  return (
    <div data-test-subj="investigationProcedureTab">
      <EuiFlexGroup direction="column" gutterSize="m" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiPanel paddingSize="m" hasShadow={false} hasBorder>
            <EuiFlexGroup gutterSize="s" alignItems="center" wrap responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon type={ICONS.procedure} aria-hidden="true" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiTitle size="xs">
                  <h2>{i18n.TITLE}</h2>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow />
              <EuiFlexItem grow={false}>
                <EuiSelect
                  compressed
                  prepend={i18n.INVESTIGATION_TYPE}
                  aria-label={i18n.INVESTIGATION_TYPE}
                  value={record.investigation_type}
                  options={[
                    ...(applicableTypeNames.includes(record.investigation_type)
                      ? []
                      : [{ value: record.investigation_type, text: i18n.TYPE_NOT_SET }]),
                    ...applicableTypeNames.map((name) => ({ value: name, text: name })),
                  ]}
                  onChange={(event) => {
                    if (event.target.value !== record.investigation_type) {
                      setApplyType(event.target.value);
                    }
                  }}
                  data-test-subj="investigationProcedureType"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  size="s"
                  iconType={ICONS.template}
                  onClick={() => setIsEditorOpen(true)}
                  data-test-subj="investigationProcedureConfigure"
                >
                  {i18n.CONFIGURE}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="m" />
            <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
              <EuiFlexItem>
                <EuiProgress
                  value={progress}
                  max={100}
                  size="m"
                  color="success"
                  aria-label={i18n.PROGRESS_LABEL}
                  data-test-subj="investigationProcedureProgress"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s" data-test-subj="investigationProcedureDoneCount">
                  <strong>{i18n.DONE_OF_TOTAL(doneCount, applicable.length)}</strong>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
            <EuiFlexGroup
              gutterSize="m"
              alignItems="flexStart"
              justifyContent="spaceBetween"
              responsive={false}
              wrap
            >
              <EuiFlexItem grow={false}>
                {requiredLeft > 0 ? (
                  <div>
                    <EuiBadge color="warning" data-test-subj="investigationProcedureRequiredLeft">
                      {i18n.REQUIRED_LEFT(requiredLeft)}
                    </EuiBadge>
                  </div>
                ) : (
                  <div>
                    <EuiBadge
                      color="success"
                      iconType={ICONS.check}
                      data-test-subj="investigationProcedureRequiredLeft"
                    >
                      {i18n.ALL_REQUIRED_DONE}
                    </EuiBadge>
                  </div>
                )}
                <EuiText
                  size="xs"
                  color="subdued"
                  css={css`
                    margin-block-start: ${euiTheme.size.xs};
                    max-width: 640px;
                  `}
                >
                  {i18n.HEADER_NOTE(record.investigation_type || i18n.TYPE_NOT_SET)}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                {record.status === 'closed' ? (
                  <EuiBadge color="hollow">{i18n.CLOSED}</EuiBadge>
                ) : (
                  <EuiButton
                    size="s"
                    fill
                    onClick={() => onOpenModal('close')}
                    data-test-subj="investigationProcedureClose"
                  >
                    {i18n.CLOSE_INVESTIGATION}
                  </EuiButton>
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="m" />
            <EuiFlexGroup gutterSize="s" alignItems="center" wrap responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButtonGroup
                  legend={i18n.FILTER_LABEL}
                  buttonSize="s"
                  options={filterOptions.map((option) => ({
                    id: `investigationTaskFilter-${option.id}`,
                    label: option.label,
                    'data-test-subj': `investigationTaskFilter-${option.id}`,
                  }))}
                  idSelected={`investigationTaskFilter-${filter}`}
                  onChange={(id) =>
                    setFilter(
                      filterOptions.find((option) => `investigationTaskFilter-${option.id}` === id)
                        ?.id ?? 'all'
                    )
                  }
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiSelect
                  compressed
                  aria-label={i18n.OWNER_FILTER_LABEL}
                  value={ownerFilter}
                  options={[
                    { value: 'any', text: i18n.OWNER_FILTER_ALL },
                    ...OWNER_TYPES.map((type) => ({ value: type, text: OWNER_TYPE_LABELS[type] })),
                  ]}
                  onChange={(event) =>
                    setOwnerFilter(OWNER_TYPES.find((type) => type === event.target.value) ?? 'any')
                  }
                  data-test-subj="investigationTaskOwnerFilter"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
        {PHASES.map((phase) => {
          const rows = visibleTasks.filter((task) => task.task.phase === phase);
          if (rows.length === 0) {
            return null;
          }
          const phaseTasks = tasks.filter((task) => task.task.phase === phase);
          const phaseApplicable = phaseTasks.filter((task) => task.status !== 'skipped');
          const phaseDone = phaseApplicable.filter((task) => task.status === 'done').length;
          return (
            <EuiFlexItem grow={false} key={phase}>
              <EuiPanel
                paddingSize="none"
                hasShadow={false}
                hasBorder
                data-test-subj={`investigationProcedurePhase-${phase}`}
              >
                <EuiFlexGroup
                  gutterSize="s"
                  alignItems="center"
                  responsive={false}
                  css={css`
                    padding: ${euiTheme.size.m};
                    border-block-end: ${euiTheme.border.thin};
                  `}
                >
                  <EuiFlexItem grow={false}>
                    <EuiTitle size="xxs">
                      <h3>{phase}</h3>
                    </EuiTitle>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="hollow">
                      {i18n.PHASE_COUNT(phaseDone, phaseApplicable.length)}
                    </EuiBadge>
                  </EuiFlexItem>
                </EuiFlexGroup>
                {rows.map((task) => {
                  const dependency = task.task.depends_on
                    ? tasksById.get(task.task.depends_on)
                    : undefined;
                  const claimId =
                    task.task.auto?.type === 'claim' ? task.task.auto.claim_id : undefined;
                  const claim = claimId ? claimsById.get(claimId) : undefined;
                  return (
                    <TaskRow
                      key={task.id}
                      task={task}
                      record={record}
                      effectiveStatus={getEffectiveStatus(task, tasksById, claimsById)}
                      dependency={dependency}
                      claim={claim}
                      currentUser={currentUser}
                      isHighlighted={highlightedId === task.id}
                      isBusy={
                        (updateItem.isLoading && updateItem.variables?.itemId === task.id) ||
                        agentRunTaskId === task.id
                      }
                      canRunWithAgent={
                        agentAvailable &&
                        Boolean(conversationId) &&
                        record.status !== 'closed' &&
                        task.task.owner.type === 'agent' &&
                        !task.task.auto &&
                        !isTaskFinished(task)
                      }
                      isRunningWithAgent={agentRunTaskId === task.id}
                      onRunWithAgent={handleRunWithAgent}
                      onToggleDone={handleToggleDone}
                      onStart={handleStart}
                      onReopen={handleReopen}
                      onSkip={setSkipTask}
                      onAssign={handleAssign}
                      onNavigateTab={onNavigateTab}
                    />
                  );
                })}
              </EuiPanel>
            </EuiFlexItem>
          );
        })}
        {visibleTasks.length === 0 ? (
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued" data-test-subj="investigationProcedureNoMatch">
              <p>{i18n.NO_TASKS_MATCH}</p>
            </EuiText>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
      {modals}
    </div>
  );
};
ProcedurePanel.displayName = 'ProcedurePanel';
