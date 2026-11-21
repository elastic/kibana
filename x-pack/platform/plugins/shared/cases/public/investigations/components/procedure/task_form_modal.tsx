/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiDatePicker,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSelect,
  EuiSwitch,
  EuiText,
  EuiTextArea,
  useGeneratedHtmlId,
} from '@elastic/eui';
import moment from 'moment-timezone';
import type { Moment } from 'moment-timezone';
import { INVESTIGATION_LIMITS } from '../../../../common/investigations/constants';
import { CaseSeverity } from '../../../../common/types/domain';
import type {
  InvestigationRecord,
  ProcedurePhase,
  TaskItem,
  TaskOwnerType,
  TaskPriority as TaskPriorityValue,
} from '../../../../common/investigations/types';
import { useBulkCreateItems } from '../../hooks';
import { useBulkGetUserProfiles } from '../../../containers/user_profiles/use_bulk_get_user_profiles';
import { useCasesContext } from '../../../components/cases_context/use_cases_context';
import { SeveritySelector } from '../../../components/severity/selector';
import { SEVERITY_TITLE } from '../../../components/severity/translations';
import type { CurrentUserProfile } from '../../../components/types';
import { useWorkflowList } from '../../hooks/use_tasks';
import { OWNER_TYPES, OWNER_TYPE_LABELS, PHASES } from './procedure_helpers';
import { TaskAssignees } from './task_assignees';
import * as i18n from './translations';

const PRIORITY_BY_SEVERITY: Record<CaseSeverity, TaskPriorityValue> = {
  [CaseSeverity.LOW]: 'low',
  [CaseSeverity.MEDIUM]: 'medium',
  [CaseSeverity.HIGH]: 'high',
  [CaseSeverity.CRITICAL]: 'critical',
};
const SEVERITY_BY_PRIORITY: Record<TaskPriorityValue, CaseSeverity> = {
  low: CaseSeverity.LOW,
  medium: CaseSeverity.MEDIUM,
  high: CaseSeverity.HIGH,
  critical: CaseSeverity.CRITICAL,
};

export interface TaskFormModalProps {
  record: InvestigationRecord;
  /** Set to add a sub-task of this root task. */
  parent?: TaskItem;
  currentUserProfile: CurrentUserProfile;
  /** The phase a new task starts in (the phase panel it was added from). */
  defaultPhase?: ProcedurePhase;
  onClose: () => void;
}

/** Adds a task, or a sub-task of `parent`, with the fields Cases tasks have. */
export const TaskFormModal: React.FC<TaskFormModalProps> = ({
  record,
  parent,
  currentUserProfile,
  defaultPhase,
  onClose,
}) => {
  const titleId = useGeneratedHtmlId();
  const { permissions } = useCasesContext();
  const { mutateAsync, isLoading } = useBulkCreateItems(record.id);
  const workflows = useWorkflowList();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [phase, setPhase] = useState<ProcedurePhase>(
    parent?.task.phase ?? defaultPhase ?? 'Investigate'
  );
  const [priority, setPriority] = useState<TaskPriorityValue>('medium');
  const [dueDate, setDueDate] = useState<Moment | null>(null);
  const [assignees, setAssignees] = useState<string[]>([]);
  const [required, setRequired] = useState(false);
  const [ownerType, setOwnerType] = useState<TaskOwnerType>('person');
  const [teamName, setTeamName] = useState('');
  const [workflowId, setWorkflowId] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const { data: userProfiles } = useBulkGetUserProfiles({ uids: assignees });
  const profiles = useMemo(() => userProfiles ?? new Map(), [userProfiles]);

  const trimmedTitle = title.trim();
  const titleError =
    trimmedTitle.length === 0
      ? i18n.TITLE_REQUIRED
      : trimmedTitle.length > INVESTIGATION_LIMITS.maxTitleLength
      ? i18n.TITLE_TOO_LONG
      : null;
  const descriptionError =
    description.trim().length > INVESTIGATION_LIMITS.maxShortTextLength ? i18n.TEXT_TOO_LONG : null;

  const submit = async () => {
    setSubmitted(true);
    if (titleError || descriptionError) {
      return;
    }
    const team = teamName.trim();
    const owner: TaskItem['task']['owner'] = parent
      ? { type: 'person', id: null, name: null }
      : ownerType === 'team'
      ? { type: 'team', id: team || null, name: team || null }
      : ownerType === 'agent'
      ? { type: 'agent', id: record.agent_id ?? null, name: record.agent_name ?? null }
      : ownerType === 'automation'
      ? { type: 'automation', id: 'workflow', name: 'Workflow' }
      : { type: 'person', id: null, name: null };
    try {
      await mutateAsync({
        items: [
          {
            kind: 'task',
            title: trimmedTitle,
            status: 'open',
            task: {
              phase,
              description: description.trim() || null,
              required,
              owner,
              priority,
              assignees,
              due_date: dueDate ? dueDate.toISOString() : null,
              sort_order: 0,
              parent_task_id: parent?.id ?? null,
              workflow_id: !parent && ownerType === 'automation' && workflowId ? workflowId : null,
            },
          },
        ],
        extract_indicators: false,
      });
      onClose();
    } catch {
      // The mutation reports the error; the form stays so nothing is lost.
    }
  };

  const workflowOptions = [
    { value: '', text: i18n.NO_WORKFLOW },
    ...(workflows.data?.results ?? []).map((workflow) => ({
      value: workflow.id,
      text: workflow.name,
    })),
  ];

  return (
    <EuiModal onClose={onClose} aria-labelledby={titleId} data-test-subj="investigationTaskForm">
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>
          {parent ? i18n.ADD_SUBTASK : i18n.ADD_TASK}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        {parent ? (
          <EuiText size="s" color="subdued" data-test-subj="investigationTaskFormParent">
            <p>{i18n.SUBTASK_OF(parent.title)}</p>
          </EuiText>
        ) : null}
        <EuiFormRow
          label={i18n.FIELD_TITLE}
          isInvalid={submitted && titleError !== null}
          error={titleError ?? undefined}
          fullWidth
        >
          <EuiFieldText
            fullWidth
            autoFocus
            value={title}
            isInvalid={submitted && titleError !== null}
            onChange={(event) => setTitle(event.target.value)}
            data-test-subj="investigationTaskFormTitle"
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.FIELD_DESCRIPTION}
          isInvalid={submitted && descriptionError !== null}
          error={descriptionError ?? undefined}
          fullWidth
        >
          <EuiTextArea
            fullWidth
            rows={3}
            value={description}
            isInvalid={submitted && descriptionError !== null}
            onChange={(event) => setDescription(event.target.value)}
            data-test-subj="investigationTaskFormDescription"
          />
        </EuiFormRow>
        <EuiFlexGroup gutterSize="m" responsive={false} wrap>
          {parent ? null : (
            <EuiFlexItem grow={false}>
              <EuiFormRow label={i18n.FIELD_PHASE}>
                <EuiSelect
                  value={phase}
                  options={PHASES.map((value) => ({ value, text: value }))}
                  onChange={(event) =>
                    setPhase(PHASES.find((value) => value === event.target.value) ?? phase)
                  }
                  data-test-subj="investigationTaskFormPhase"
                />
              </EuiFormRow>
            </EuiFlexItem>
          )}
          <EuiFlexItem>
            <EuiFormRow label={SEVERITY_TITLE}>
              <SeveritySelector
                selectedSeverity={SEVERITY_BY_PRIORITY[priority]}
                onSeverityChange={(severity) => setPriority(PRIORITY_BY_SEVERITY[severity])}
                isLoading={false}
                isDisabled={false}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow label={i18n.DUE_DATE_LABEL}>
              <EuiDatePicker
                showTimeSelect
                selected={dueDate}
                minDate={moment()}
                onChange={(date) => setDueDate(date)}
                onClear={() => setDueDate(null)}
                placeholder={i18n.NO_DUE_DATE}
                data-test-subj="investigationTaskFormDueDate"
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFormRow label={i18n.FIELD_ASSIGNEES} fullWidth>
          <TaskAssignees
            assigneeUids={assignees}
            userProfiles={profiles}
            currentUserProfile={currentUserProfile}
            canAssign={permissions.assign}
            onChange={setAssignees}
            data-test-subj="investigationTaskFormAssignees"
          />
        </EuiFormRow>
        {parent ? null : (
          <EuiFlexGroup gutterSize="m" responsive={false} wrap>
            <EuiFlexItem grow={false}>
              <EuiFormRow label={i18n.FIELD_OWNER_TYPE}>
                <EuiSelect
                  value={ownerType}
                  options={OWNER_TYPES.map((value) => ({
                    value,
                    text: OWNER_TYPE_LABELS[value],
                  }))}
                  onChange={(event) =>
                    setOwnerType(
                      OWNER_TYPES.find((value) => value === event.target.value) ?? 'person'
                    )
                  }
                  data-test-subj="investigationTaskFormOwnerType"
                />
              </EuiFormRow>
            </EuiFlexItem>
            {ownerType === 'team' ? (
              <EuiFlexItem>
                <EuiFormRow label={i18n.FIELD_TEAM_NAME}>
                  <EuiFieldText
                    value={teamName}
                    onChange={(event) => setTeamName(event.target.value)}
                    data-test-subj="investigationTaskFormTeam"
                  />
                </EuiFormRow>
              </EuiFlexItem>
            ) : null}
            {ownerType === 'automation' ? (
              <EuiFlexItem>
                <EuiFormRow
                  label={i18n.FIELD_WORKFLOW}
                  helpText={i18n.FIELD_WORKFLOW_HELP}
                  isInvalid={workflows.isError}
                  error={workflows.isError ? i18n.WORKFLOWS_UNAVAILABLE : undefined}
                >
                  <EuiSelect
                    isInvalid={workflows.isError}
                    value={workflowId}
                    options={workflowOptions}
                    isLoading={workflows.isLoading}
                    disabled={workflows.isError}
                    onChange={(event) => setWorkflowId(event.target.value)}
                    data-test-subj="investigationTaskFormWorkflow"
                  />
                </EuiFormRow>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        )}
        <EuiFormRow fullWidth>
          <EuiSwitch
            label={i18n.FIELD_REQUIRED_HELP}
            checked={required}
            onChange={(event) => setRequired(event.target.checked)}
            data-test-subj="investigationTaskFormRequired"
          />
        </EuiFormRow>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose} data-test-subj="investigationTaskFormCancel">
          {i18n.CANCEL}
        </EuiButtonEmpty>
        <EuiButton
          fill
          isLoading={isLoading}
          onClick={() => void submit()}
          data-test-subj="investigationTaskFormSubmit"
        >
          {parent ? i18n.ADD_SUBTASK : i18n.ADD_TASK}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
TaskFormModal.displayName = 'TaskFormModal';
