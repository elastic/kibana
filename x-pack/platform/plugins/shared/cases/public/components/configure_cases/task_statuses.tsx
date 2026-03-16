/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiDescribedFormGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { TaskStatusDefinition } from '../../../common/types/domain/task/v1';
import { BUILTIN_STATUS_KEYS, mergeTaskStatusesWithDefaults } from '../../../common/types/domain/task/v1';
import { useCasesContext } from '../cases_context/use_cases_context';

interface TaskStatusesProps {
  /** Statuses currently stored in the configure SO (may be empty = use defaults). */
  taskStatuses: TaskStatusDefinition[];
  disabled: boolean;
  isLoading: boolean;
  onAdd: () => void;
  onEdit: (status: TaskStatusDefinition) => void;
  /** Called with the full updated list. */
  onChange: (statuses: TaskStatusDefinition[]) => void;
}

const TITLE = i18n.translate('xpack.cases.configure.taskStatuses.title', {
  defaultMessage: 'Task statuses',
});

const DESCRIPTION = i18n.translate('xpack.cases.configure.taskStatuses.description', {
  defaultMessage:
    'Define the statuses available for tasks. Built-in statuses can be disabled but not removed. Custom statuses can be added and deleted.',
});

const ADD_STATUS = i18n.translate('xpack.cases.configure.taskStatuses.addStatus', {
  defaultMessage: 'Add status',
});

const EDIT_STATUS = i18n.translate('xpack.cases.configure.taskStatuses.editStatus', {
  defaultMessage: 'Edit status',
});

const DELETE_STATUS = i18n.translate('xpack.cases.configure.taskStatuses.deleteStatus', {
  defaultMessage: 'Delete status',
});

const BUILTIN_TOOLTIP = i18n.translate('xpack.cases.configure.taskStatuses.builtinTooltip', {
  defaultMessage: 'Built-in statuses cannot be deleted, but can be disabled.',
});

export const TaskStatuses: React.FC<TaskStatusesProps> = ({
  taskStatuses,
  disabled,
  isLoading,
  onAdd,
  onEdit,
  onChange,
}) => {
  const { permissions } = useCasesContext();

  const mergedStatuses = useMemo(() => mergeTaskStatusesWithDefaults(taskStatuses), [taskStatuses]);

  if (!permissions.settings) {
    return null;
  }

  const canModify = !disabled && permissions.settings;

  const handleToggleDisabled = (key: string, currentDisabled: boolean) => {
    const updated = mergedStatuses.map((s) =>
      s.key === key ? { ...s, disabled: !currentDisabled } : s
    );
    onChange(updated);
  };

  const handleDelete = (key: string) => {
    // Only custom statuses can be deleted
    const updated = mergedStatuses.filter((s) => s.key !== key);
    onChange(updated);
  };

  return (
    <EuiDescribedFormGroup
      fullWidth
      title={<h2>{TITLE}</h2>}
      description={<p>{DESCRIPTION}</p>}
      data-test-subj="task-statuses-form-group"
    >
      <EuiPanel paddingSize="s" color="subdued" hasBorder={false} hasShadow={false}>
        {mergedStatuses.map((status) => {
          const isBuiltin = BUILTIN_STATUS_KEYS.has(status.key);
          const isDisabled = status.disabled === true;

          return (
            <EuiFlexGroup
              key={status.key}
              alignItems="center"
              gutterSize="s"
              responsive={false}
              style={{ marginBottom: 8 }}
              data-test-subj={`task-status-row-${status.key}`}
            >
              {/* Color badge */}
              <EuiFlexItem grow={false}>
                <EuiBadge color={status.color} style={{ opacity: isDisabled ? 0.4 : 1 }}>
                  {status.label}
                </EuiBadge>
              </EuiFlexItem>

              {/* Key hint */}
              <EuiFlexItem>
                <EuiText size="xs" color="subdued">
                  {status.key}
                  {isBuiltin && (
                    <span
                      style={{ marginLeft: 6, fontStyle: 'italic' }}
                    >
                      (built-in)
                    </span>
                  )}
                </EuiText>
              </EuiFlexItem>

              {/* Enable/disable toggle */}
              <EuiFlexItem grow={false}>
                <EuiSwitch
                  label=""
                  showLabel={false}
                  checked={!isDisabled}
                  onChange={() => handleToggleDisabled(status.key, isDisabled)}
                  disabled={!canModify}
                  data-test-subj={`task-status-toggle-${status.key}`}
                  compressed
                />
              </EuiFlexItem>

              {/* Edit button */}
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  iconType="pencil"
                  size="xs"
                  aria-label={EDIT_STATUS}
                  disabled={!canModify}
                  onClick={() => onEdit(status)}
                  data-test-subj={`task-status-edit-${status.key}`}
                />
              </EuiFlexItem>

              {/* Delete — only for custom statuses */}
              <EuiFlexItem grow={false}>
                {isBuiltin ? (
                  <EuiToolTip content={BUILTIN_TOOLTIP}>
                    <EuiButtonIcon
                      iconType="trash"
                      size="xs"
                      color="danger"
                      aria-label={DELETE_STATUS}
                      disabled
                      data-test-subj={`task-status-delete-${status.key}`}
                    />
                  </EuiToolTip>
                ) : (
                  <EuiButtonIcon
                    iconType="trash"
                    size="xs"
                    color="danger"
                    aria-label={DELETE_STATUS}
                    disabled={!canModify}
                    onClick={() => handleDelete(status.key)}
                    data-test-subj={`task-status-delete-${status.key}`}
                  />
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        })}

        <EuiSpacer size="s" />

        <EuiFlexGroup justifyContent="center">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              isLoading={isLoading}
              isDisabled={!canModify}
              size="s"
              iconType="plusInCircle"
              onClick={onAdd}
              data-test-subj="task-status-add"
            >
              {ADD_STATUS}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="s" />
      </EuiPanel>
    </EuiDescribedFormGroup>
  );
};

TaskStatuses.displayName = 'TaskStatuses';
