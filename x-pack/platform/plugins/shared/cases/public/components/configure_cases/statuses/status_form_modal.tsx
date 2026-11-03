/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiRadioGroup,
  useGeneratedHtmlId,
} from '@elastic/eui';
import {
  CASE_STATUS_CATEGORIES,
  CASE_STATUS_COLORS,
  MAX_CASE_STATUS_LABEL_LENGTH,
} from '../../../../common/constants';
import type { CaseStatusCategory, CaseStatusDefinition } from '../../../../common/types/domain';
import type { NewStatus } from './utils';
import { isLabelTaken } from './utils';
import { SaveErrors } from './save_errors';
import * as i18n from './translations';

export interface StatusFormModalProps {
  /** The status being edited; null when adding one. */
  status: CaseStatusDefinition | null;
  statuses: CaseStatusDefinition[];
  isSaving: boolean;
  errors: string[];
  onSave: (status: NewStatus) => void;
  onClose: () => void;
}

const CATEGORY_OPTIONS = CASE_STATUS_CATEGORIES.map((category) => ({
  id: category,
  label: i18n.CATEGORY_LABELS[category],
  'data-test-subj': `case-status-form-category-${category}`,
}));

const isCategory = (id: string): id is CaseStatusCategory =>
  (CASE_STATUS_CATEGORIES as readonly string[]).includes(id);

const getNameError = (
  label: string,
  statuses: CaseStatusDefinition[],
  ignoreKey?: string
): string | undefined => {
  if (label.trim().length === 0) {
    return i18n.NAME_REQUIRED;
  }
  if (label.trim().length > MAX_CASE_STATUS_LABEL_LENGTH) {
    return i18n.NAME_TOO_LONG(MAX_CASE_STATUS_LABEL_LENGTH);
  }
  if (isLabelTaken(statuses, label, ignoreKey)) {
    return i18n.NAME_TAKEN;
  }
};

const StatusFormModalComponent: React.FC<StatusFormModalProps> = ({
  status,
  statuses,
  isSaving,
  errors,
  onSave,
  onClose,
}) => {
  const titleId = useGeneratedHtmlId();
  const categoryGroupName = useGeneratedHtmlId({ prefix: 'caseStatusCategory' });
  const [label, setLabel] = useState(status?.label ?? '');
  const [color, setColor] = useState<CaseStatusDefinition['color']>(status?.color ?? 'default');
  const [category, setCategory] = useState<CaseStatusCategory>(status?.category ?? 'active');
  const [isNameTouched, setIsNameTouched] = useState(false);

  const nameError = getNameError(label, statuses, status?.key);
  const showNameError = isNameTouched && nameError != null;

  const onSubmit = useCallback(() => {
    setIsNameTouched(true);
    if (nameError == null) {
      onSave({ label, color, category });
    }
  }, [category, color, label, nameError, onSave]);

  return (
    <EuiModal onClose={onClose} aria-labelledby={titleId} data-test-subj="case-status-form-modal">
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>
          {status == null ? i18n.ADD_STATUS_TITLE : i18n.EDIT_STATUS_TITLE}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <SaveErrors errors={errors} />
        <EuiForm data-test-subj="case-status-form">
          <EuiFormRow label={i18n.NAME} isInvalid={showNameError} error={nameError} fullWidth>
            <EuiFieldText
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              onBlur={() => setIsNameTouched(true)}
              isInvalid={showNameError}
              fullWidth
              autoFocus
              data-test-subj="case-status-form-name"
            />
          </EuiFormRow>
          <EuiFormRow label={i18n.COLOR} fullWidth>
            <EuiFlexGroup gutterSize="s" wrap responsive={false}>
              {CASE_STATUS_COLORS.map((swatch) => {
                const isSelected = swatch === color;
                return (
                  <EuiFlexItem grow={false} key={swatch}>
                    <EuiBadge
                      color={swatch}
                      iconType={isSelected ? 'check' : undefined}
                      onClick={() => setColor(swatch)}
                      onClickAriaLabel={
                        isSelected
                          ? i18n.SELECTED_COLOR(i18n.COLOR_LABELS[swatch])
                          : i18n.PICK_COLOR(i18n.COLOR_LABELS[swatch])
                      }
                      data-test-subj={`case-status-form-color-${swatch}`}
                    >
                      {label.trim() || i18n.NAME_PLACEHOLDER}
                    </EuiBadge>
                  </EuiFlexItem>
                );
              })}
            </EuiFlexGroup>
          </EuiFormRow>
          <EuiFormRow
            label={i18n.CATEGORY}
            helpText={status != null ? i18n.CATEGORY_LOCKED : undefined}
            fullWidth
          >
            <EuiRadioGroup
              name={categoryGroupName}
              options={CATEGORY_OPTIONS}
              idSelected={category}
              onChange={(id) => {
                if (isCategory(id)) {
                  setCategory(id);
                }
              }}
              disabled={status != null}
              data-test-subj="case-status-form-category"
            />
          </EuiFormRow>
          {status != null && (
            <EuiFormRow label={i18n.KEY} helpText={i18n.KEY_HELP} fullWidth>
              <EuiFieldText
                value={status.key}
                readOnly
                fullWidth
                data-test-subj="case-status-form-key"
              />
            </EuiFormRow>
          )}
        </EuiForm>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose} data-test-subj="case-status-form-cancel">
          {i18n.CANCEL}
        </EuiButtonEmpty>
        <EuiButton
          fill
          onClick={onSubmit}
          isLoading={isSaving}
          isDisabled={showNameError}
          data-test-subj="case-status-form-save"
        >
          {i18n.SAVE}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};

StatusFormModalComponent.displayName = 'StatusFormModal';

export const StatusFormModal = React.memo(StatusFormModalComponent);
