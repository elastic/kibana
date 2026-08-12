/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCheckboxGroup,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { getConditionalLogicActions, getValidationActions } from '../../utils/field_action_catalog';
import type { FieldRuleAction } from '../../utils/field_action_catalog';
import type { ConfigurableFieldAction } from './types';
import * as i18n from '../../translations';

export interface ConfigureAndAddResult {
  fieldObject: Record<string, unknown>;
  displayName: string;
}

interface ConfigureAndAddModalProps {
  action: ConfigurableFieldAction;
  /** When false, hides the Conditional logic section (field-definition editor). */
  allowConditional?: boolean;
  onCancel: () => void;
  onConfirm: (result: ConfigureAndAddResult) => void;
}

const mergeRulesIntoField = (
  base: Record<string, unknown>,
  rules: FieldRuleAction[]
): Record<string, unknown> => {
  const next: Record<string, unknown> = { ...base };
  for (const rule of rules) {
    const block = (next[rule.blockKey] as Record<string, unknown> | undefined) ?? {};
    next[rule.blockKey] = { ...block, [rule.ruleKey]: rule.value };
  }
  return next;
};

/**
 * Pre-insert configuration for a field scaffold or library `$ref`.
 *
 * Iteration surface:
 *  - Basics: name / label (field types only)
 *  - Validation + conditional rule checkboxes (scaffolds, not a full form editor)
 *  - Confirm merges selected rules onto the field object and inserts immediately
 *
 * Next iterations can grow this into a real form (operator pickers, compound conditions,
 * live YAML preview) without changing the Actions menu wiring — keep confirming via
 * {@link ConfigureAndAddResult}.
 */
export const ConfigureAndAddModal: React.FC<ConfigureAndAddModalProps> = ({
  action,
  allowConditional = true,
  onCancel,
  onConfirm,
}) => {
  const isFieldType = action.kind === 'fieldType';
  const control = isFieldType ? action.control : 'INPUT_TEXT';
  const baseObject = useMemo((): Record<string, unknown> => {
    if (action.kind === 'fieldType') {
      return { ...action.scaffold };
    }
    return { $ref: action.fieldName };
  }, [action]);

  const [name, setName] = useState(
    typeof baseObject.name === 'string' ? baseObject.name : action.label
  );
  const [label, setLabel] = useState(
    typeof baseObject.label === 'string' ? baseObject.label : action.label
  );
  const [selectedRuleIds, setSelectedRuleIds] = useState<Record<string, boolean>>({});

  const validationRules = useMemo(() => getValidationActions(control), [control]);
  const conditionalRules = useMemo(
    () => (allowConditional ? getConditionalLogicActions() : []),
    [allowConditional]
  );

  const validationOptions = useMemo(
    () => validationRules.map((rule) => ({ id: rule.id, label: rule.label })),
    [validationRules]
  );
  const conditionalOptions = useMemo(
    () => conditionalRules.map((rule) => ({ id: rule.id, label: rule.label })),
    [conditionalRules]
  );

  const handleConfirm = useCallback(() => {
    const selectedRules = [...validationRules, ...conditionalRules].filter(
      (rule) => selectedRuleIds[rule.id]
    );
    let fieldObject = mergeRulesIntoField(baseObject, selectedRules);
    if (isFieldType) {
      fieldObject = {
        ...fieldObject,
        name: name.trim() || fieldObject.name,
        ...(fieldObject.label !== undefined || label.trim()
          ? { label: label.trim() || fieldObject.label }
          : {}),
      };
    }
    onConfirm({
      fieldObject,
      displayName: isFieldType ? String(fieldObject.name ?? action.label) : action.fieldName,
    });
  }, [
    action,
    baseObject,
    conditionalRules,
    isFieldType,
    label,
    name,
    onConfirm,
    selectedRuleIds,
    validationRules,
  ]);

  return (
    <EuiModal onClose={onCancel} maxWidth={520} data-test-subj="configureAndAddModal">
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <FormattedMessage
            id="xpack.cases.templates.actionsMenu.configureAndAdd.title"
            defaultMessage="Configure and add — {label}"
            values={{ label: action.label }}
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText size="s" color="subdued">
          <p>{i18n.ACTIONS_MENU_CONFIGURE_AND_ADD_DESC}</p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiForm component="form" onSubmit={(e) => e.preventDefault()}>
          {isFieldType && (
            <>
              <EuiFormRow label={i18n.ACTIONS_MENU_CONFIGURE_NAME_LABEL}>
                <EuiFieldText
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  compressed
                  data-test-subj="configureAndAdd-name"
                />
              </EuiFormRow>
              <EuiFormRow label={i18n.ACTIONS_MENU_CONFIGURE_LABEL_LABEL}>
                <EuiFieldText
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  compressed
                  data-test-subj="configureAndAdd-label"
                />
              </EuiFormRow>
              <EuiSpacer size="m" />
            </>
          )}

          <EuiFormRow label={i18n.ACTION_VALIDATION_TITLE}>
            <EuiCheckboxGroup
              options={validationOptions}
              idToSelectedMap={selectedRuleIds}
              onChange={(id) =>
                setSelectedRuleIds((prev) => ({ ...prev, [id]: !prev[id] }))
              }
              data-test-subj="configureAndAdd-validation"
            />
          </EuiFormRow>

          <EuiSpacer size="m" />

          {allowConditional && (
            <EuiFormRow label={i18n.ACTION_CONDITIONAL_TITLE}>
              <EuiCheckboxGroup
                options={conditionalOptions}
                idToSelectedMap={selectedRuleIds}
                onChange={(id) =>
                  setSelectedRuleIds((prev) => ({ ...prev, [id]: !prev[id] }))
                }
                data-test-subj="configureAndAdd-conditional"
              />
            </EuiFormRow>
          )}
        </EuiForm>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onCancel} data-test-subj="configureAndAdd-cancel">
          <FormattedMessage
            id="xpack.cases.templates.actionsMenu.configureAndAdd.cancel"
            defaultMessage="Cancel"
          />
        </EuiButtonEmpty>
        <EuiButton fill onClick={handleConfirm} data-test-subj="configureAndAdd-confirm">
          <FormattedMessage
            id="xpack.cases.templates.actionsMenu.configureAndAdd.confirm"
            defaultMessage="Add field"
          />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};

ConfigureAndAddModal.displayName = 'ConfigureAndAddModal';
