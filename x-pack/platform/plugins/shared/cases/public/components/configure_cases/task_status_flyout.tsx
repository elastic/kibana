/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiSpacer,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { TaskStatusDefinition } from '../../../common/types/domain/task/v1';

interface TaskStatusFlyoutProps {
  statusToEdit: TaskStatusDefinition | null;
  onSave: (status: TaskStatusDefinition) => void;
  onClose: () => void;
}

// EUI badge colors that render with visible color fills
const BADGE_COLOR_OPTIONS = [
  { value: 'default', label: 'Grey' },
  { value: 'primary', label: 'Blue' },
  { value: 'success', label: 'Green' },
  { value: 'warning', label: 'Yellow' },
  { value: 'danger', label: 'Red' },
  { value: 'accent', label: 'Pink' },
];

const TITLE_ADD = i18n.translate('xpack.cases.configure.taskStatusFlyout.titleAdd', {
  defaultMessage: 'Add task status',
});

const TITLE_EDIT = i18n.translate('xpack.cases.configure.taskStatusFlyout.titleEdit', {
  defaultMessage: 'Edit task status',
});

const KEY_LABEL = i18n.translate('xpack.cases.configure.taskStatusFlyout.keyLabel', {
  defaultMessage: 'Key',
});

const KEY_HELP = i18n.translate('xpack.cases.configure.taskStatusFlyout.keyHelp', {
  defaultMessage:
    'Unique identifier used internally (e.g. "in_review"). Lowercase letters, numbers, and underscores only.',
});

const LABEL_LABEL = i18n.translate('xpack.cases.configure.taskStatusFlyout.labelLabel', {
  defaultMessage: 'Label',
});

const COLOR_LABEL = i18n.translate('xpack.cases.configure.taskStatusFlyout.colorLabel', {
  defaultMessage: 'Color',
});

const SAVE = i18n.translate('xpack.cases.configure.taskStatusFlyout.save', {
  defaultMessage: 'Save',
});

const CANCEL = i18n.translate('xpack.cases.configure.taskStatusFlyout.cancel', {
  defaultMessage: 'Cancel',
});

export const TaskStatusFlyout: React.FC<TaskStatusFlyoutProps> = ({
  statusToEdit,
  onSave,
  onClose,
}) => {
  const titleId = useGeneratedHtmlId();
  const [key, setKey] = useState(statusToEdit?.key ?? '');
  const [label, setLabel] = useState(statusToEdit?.label ?? '');
  const [color, setColor] = useState(statusToEdit?.color ?? 'default');

  const isEditMode = statusToEdit !== null;
  const isKeyValid = /^[a-z0-9_]+$/.test(key) && key.length > 0;
  const isLabelValid = label.trim().length > 0;
  const isValid = isKeyValid && isLabelValid;

  const handleSave = () => {
    if (!isValid) return;
    onSave({ key: key.trim(), label: label.trim(), color });
  };

  return (
    <EuiFlyout onClose={onClose} aria-labelledby={titleId} size="s">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h3 id={titleId}>{isEditMode ? TITLE_EDIT : TITLE_ADD}</h3>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiFormRow
          label={KEY_LABEL}
          helpText={KEY_HELP}
          isInvalid={key.length > 0 && !isKeyValid}
          error={i18n.translate('xpack.cases.configure.taskStatusFlyout.keyError', {
            defaultMessage: 'Key must be lowercase letters, numbers, and underscores only.',
          })}
        >
          <EuiFieldText
            value={key}
            onChange={(e) => setKey(e.target.value)}
            disabled={isEditMode}
            data-test-subj="task-status-flyout-key"
          />
        </EuiFormRow>

        <EuiSpacer size="m" />

        <EuiFormRow label={LABEL_LABEL}>
          <EuiFieldText
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            data-test-subj="task-status-flyout-label"
          />
        </EuiFormRow>

        <EuiSpacer size="m" />

        <EuiFormRow label={COLOR_LABEL}>
          <EuiFlexGroup gutterSize="s" wrap responsive={false} alignItems="center">
            {BADGE_COLOR_OPTIONS.map((opt) => (
              <EuiFlexItem key={opt.value} grow={false}>
                <EuiBadge
                  color={opt.value}
                  onClick={() => setColor(opt.value)}
                  onClickAriaLabel={`Select ${opt.label} color`}
                  data-test-subj={`task-status-flyout-color-${opt.value}`}
                  style={{
                    cursor: 'pointer',
                    outline:
                      color === opt.value
                        ? '2px solid currentColor'
                        : '2px solid transparent',
                    outlineOffset: 2,
                    minWidth: 56,
                    textAlign: 'center',
                  }}
                >
                  {opt.label}
                </EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </EuiFormRow>

        <EuiSpacer size="m" />

        <EuiFormRow
          label={i18n.translate('xpack.cases.configure.taskStatusFlyout.previewLabel', {
            defaultMessage: 'Preview',
          })}
        >
          <EuiBadge color={color}>{label || key || 'Status'}</EuiBadge>
        </EuiFormRow>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="flexStart">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} data-test-subj="task-status-flyout-cancel">
              {CANCEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                onClick={handleSave}
                isDisabled={!isValid}
                data-test-subj="task-status-flyout-save"
              >
                {SAVE}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

TaskStatusFlyout.displayName = 'TaskStatusFlyout';
