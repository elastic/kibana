/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
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
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { FieldType, InlineFieldSchema } from '../../../../../common/types/domain/template/fields';
import type { InlineField } from '../../../../../common/types/domain/template/fields';
import { FieldDefinitionPreview } from '../../../field_library/components/field_definition_preview';
import { FIELD_TYPE_TITLES } from '../../utils/field_type_titles';
import { buildFieldScaffold } from '../../utils/template_field_actions';
import type { ConfigurableFieldAction } from './types';
import * as i18n from '../../translations';

export interface ConfigureAndAddResult {
  fieldObject: Record<string, unknown>;
  displayName: string;
}

interface ConfigureAndAddModalProps {
  action: ConfigurableFieldAction;
  existingFieldNames: ReadonlySet<string>;
  siblingFieldNames: readonly string[];
  onCancel: () => void;
  onConfirm: (result: ConfigureAndAddResult) => void;
}

type ConditionOperator = 'eq' | 'neq' | 'contains' | 'empty' | 'not_empty';

interface ConditionDraft {
  id: string;
  field: string;
  operator: ConditionOperator;
  value: string;
}

type ValidationRuleType = 'required' | 'required_on_close' | 'required_when';

interface ValidationDraft {
  id: string;
  type: ValidationRuleType;
  field: string;
  operator: ConditionOperator;
  value: string;
}

const OPTIONS_CONTROLS = new Set<string>([
  FieldType.SELECT_BASIC,
  FieldType.RADIO_GROUP,
  FieldType.CHECKBOX_GROUP,
]);

const OPERATOR_OPTIONS = [
  { value: 'eq', text: i18n.ACTIONS_MENU_CONFIGURE_OPERATOR_EQ },
  { value: 'neq', text: i18n.ACTIONS_MENU_CONFIGURE_OPERATOR_NEQ },
  { value: 'contains', text: i18n.ACTIONS_MENU_CONFIGURE_OPERATOR_CONTAINS },
  { value: 'empty', text: i18n.ACTIONS_MENU_CONFIGURE_OPERATOR_EMPTY },
  { value: 'not_empty', text: i18n.ACTIONS_MENU_CONFIGURE_OPERATOR_NOT_EMPTY },
];

const VALIDATION_TYPE_OPTIONS = [
  { value: 'required', text: i18n.VALIDATION_RULE_REQUIRED },
  { value: 'required_when', text: i18n.ACTIONS_MENU_CONFIGURE_REQUIRED_WHEN },
  { value: 'required_on_close', text: i18n.ACTIONS_MENU_CONFIGURE_REQUIRED_ON_CLOSE },
];

const MODAL_WIDTH = 640;

let draftId = 0;
const nextDraftId = (): string => {
  draftId += 1;
  return `draft-${draftId}`;
};

const toSentenceCase = (value: string): string =>
  value.length === 0 ? value : `${value.charAt(0)}${value.slice(1).toLowerCase()}`;

export const slugifyFieldName = (label: string): string => {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return slug.length > 0 ? slug : 'field';
};

export const uniquifyFieldName = (base: string, existing: ReadonlySet<string>): string => {
  if (!existing.has(base)) {
    return base;
  }
  let counter = 2;
  while (existing.has(`${base}_${counter}`)) {
    counter += 1;
  }
  return `${base}_${counter}`;
};

const parseLibraryInlineField = (definition?: string): InlineField | null => {
  if (!definition?.trim()) {
    return null;
  }
  try {
    const parsed = InlineFieldSchema.safeParse(parseYaml(definition));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

const toCondition = (draft: ConditionDraft | ValidationDraft): Record<string, unknown> | null => {
  if (!draft.field) {
    return null;
  }
  if (draft.operator === 'empty' || draft.operator === 'not_empty') {
    return { field: draft.field, operator: draft.operator };
  }
  return { field: draft.field, operator: draft.operator, value: draft.value };
};

const omitEmptyBlocks = (field: Record<string, unknown>): Record<string, unknown> => {
  const next = { ...field };
  const display = next.display as Record<string, unknown> | undefined;
  const validation = next.validation as Record<string, unknown> | undefined;
  const metadata = next.metadata as Record<string, unknown> | undefined;
  if (display && Object.keys(display).length === 0) {
    delete next.display;
  }
  if (validation && Object.keys(validation).length === 0) {
    delete next.validation;
  }
  if (metadata && Object.keys(metadata).length === 0) {
    delete next.metadata;
  }
  return next;
};

const operatorLabel = (operator: ConditionOperator): string =>
  OPERATOR_OPTIONS.find((option) => option.value === operator)?.text ?? operator;

const formatConditionPhrase = (
  field: string,
  operator: ConditionOperator,
  value: string
): string => {
  const fieldText = field || i18n.ACTIONS_MENU_CONFIGURE_CONDITION_PLACEHOLDER;
  const operatorText = operatorLabel(operator);
  if (operator === 'empty' || operator === 'not_empty') {
    return i18n.ACTIONS_MENU_CONFIGURE_CONDITION_PHRASE({
      field: fieldText,
      operator: operatorText,
    });
  }
  return i18n.ACTIONS_MENU_CONFIGURE_CONDITION_PHRASE({
    field: fieldText,
    operator: operatorText,
    value: value.trim() || i18n.ACTIONS_MENU_CONFIGURE_CONDITION_PLACEHOLDER,
  });
};

interface ConditionInputsProps {
  field: string;
  operator: ConditionOperator;
  value: string;
  fieldOptions: Array<{ value: string; text: string }>;
  fieldDisabled?: boolean;
  onFieldChange: (field: string) => void;
  onOperatorChange: (operator: ConditionOperator) => void;
  onValueChange: (value: string) => void;
}

function ConditionInputs({
  field,
  operator,
  value,
  fieldOptions,
  fieldDisabled,
  onFieldChange,
  onOperatorChange,
  onValueChange,
}: ConditionInputsProps) {
  return (
    <>
      <EuiFlexItem grow={false}>
        <EuiSelect
          compressed
          options={fieldOptions}
          value={field}
          disabled={fieldDisabled}
          onChange={(event) => onFieldChange(event.target.value)}
          aria-label={i18n.ACTIONS_MENU_CONFIGURE_CONDITION_FIELD}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiSelect
          compressed
          options={OPERATOR_OPTIONS}
          value={operator}
          onChange={(event) => onOperatorChange(event.target.value as ConditionOperator)}
          aria-label={i18n.ACTIONS_MENU_CONFIGURE_CONDITION_OPERATOR}
        />
      </EuiFlexItem>
      {operator !== 'empty' && operator !== 'not_empty' ? (
        <EuiFlexItem grow={false}>
          <EuiFieldText
            compressed
            value={value}
            placeholder={i18n.ACTIONS_MENU_CONFIGURE_VALUE_PLACEHOLDER}
            onChange={(event) => onValueChange(event.target.value)}
            aria-label={i18n.ACTIONS_MENU_CONFIGURE_CONDITION_VALUE}
          />
        </EuiFlexItem>
      ) : null}
    </>
  );
}

ConditionInputs.displayName = 'ConditionInputs';

export const ConfigureAndAddModal: React.FC<ConfigureAndAddModalProps> = ({
  action,
  existingFieldNames,
  siblingFieldNames,
  onCancel,
  onConfirm,
}) => {
  const { euiTheme } = useEuiTheme();
  const isFieldType = action.kind === 'fieldType';
  const libraryField =
    action.kind === 'libraryField' ? parseLibraryInlineField(action.definition) : null;
  const control = isFieldType ? action.control : libraryField?.control ?? 'INPUT_TEXT';
  const scaffold = useMemo(
    () => (isFieldType ? buildFieldScaffold(action.control) ?? { ...action.scaffold } : {}),
    [action, isFieldType]
  );

  const [label, setLabel] = useState(isFieldType ? '' : libraryField?.label ?? action.label);
  const [showLabelError, setShowLabelError] = useState(false);
  const [nameOverridden, setNameOverridden] = useState(false);
  const [name, setName] = useState('');
  const [optionsText, setOptionsText] = useState(() => {
    const options = (scaffold.metadata as { options?: string[] } | undefined)?.options;
    return Array.isArray(options) ? options.join(', ') : '';
  });
  const [toggleDefault, setToggleDefault] = useState(
    (scaffold.metadata as { default?: boolean } | undefined)?.default === true
  );
  const [validationRules, setValidationRules] = useState<ValidationDraft[]>([]);
  const [conditions, setConditions] = useState<ConditionDraft[]>([]);
  const labelInputRef = useRef<HTMLInputElement | null>(null);

  const hasLabel = label.trim().length > 0;
  const generatedName = hasLabel
    ? uniquifyFieldName(slugifyFieldName(label), existingFieldNames)
    : '';
  const effectiveName = nameOverridden ? name.trim() : generatedName;
  const keyIsTaken = Boolean(effectiveName) && existingFieldNames.has(effectiveName);
  const canSubmit = isFieldType ? hasLabel && effectiveName.length > 0 && !keyIsTaken : true;

  const fieldSelectOptions = useMemo(
    () => siblingFieldNames.map((fieldName) => ({ value: fieldName, text: fieldName })),
    [siblingFieldNames]
  );
  const canUseConditions = siblingFieldNames.length > 0;
  const modalTitleId = useGeneratedHtmlId();

  const handleLabelChange = (value: string) => {
    setLabel(value);
    if (showLabelError && value.trim()) {
      setShowLabelError(false);
    }
    if (!nameOverridden) {
      setName(value.trim() ? uniquifyFieldName(slugifyFieldName(value), existingFieldNames) : '');
    }
  };

  const previewField = useMemo((): Record<string, unknown> | null => {
    const validation: Record<string, unknown> = {};
    for (const rule of validationRules) {
      if (rule.type === 'required') {
        validation.required = true;
      } else if (rule.type === 'required_on_close') {
        validation.required_on_close = true;
      } else {
        const condition = toCondition(rule);
        if (condition) {
          validation.required_when = condition;
        }
      }
    }
    const display: Record<string, unknown> = {};
    const showWhen = conditions.map(toCondition).find((condition) => condition != null);
    if (showWhen) {
      display.show_when = showWhen;
    }

    if (isFieldType) {
      const metadata = {
        ...((scaffold.metadata as Record<string, unknown> | undefined) ?? {}),
      };
      if (OPTIONS_CONTROLS.has(control)) {
        const options = optionsText
          .split(',')
          .map((option) => option.trim())
          .filter((option) => option.length > 0);
        if (options.length > 0) {
          metadata.options = options;
        } else {
          delete metadata.options;
        }
      }
      if (control === FieldType.TOGGLE) {
        metadata.default = toggleDefault;
      }
      return omitEmptyBlocks({
        ...scaffold,
        name: effectiveName || 'field',
        label: label.trim() || i18n.ACTIONS_MENU_CONFIGURE_UNTITLED,
        metadata,
        ...(Object.keys(display).length > 0 ? { display } : {}),
        ...(Object.keys(validation).length > 0 ? { validation } : {}),
      });
    }

    if (!libraryField) {
      return null;
    }
    return omitEmptyBlocks({
      ...libraryField,
      ...(Object.keys(display).length > 0 ? { display } : {}),
      ...(Object.keys(validation).length > 0
        ? { validation: { ...(libraryField.validation ?? {}), ...validation } }
        : {}),
    });
  }, [
    conditions,
    control,
    effectiveName,
    isFieldType,
    label,
    libraryField,
    optionsText,
    scaffold,
    toggleDefault,
    validationRules,
  ]);

  const previewYaml = useMemo(
    () => (previewField ? stringifyYaml(previewField) : ''),
    [previewField]
  );

  const requirementBadge = useMemo(() => {
    const requiredWhen = validationRules.find((rule) => rule.type === 'required_when');
    if (requiredWhen) {
      return i18n.ACTIONS_MENU_CONFIGURE_BADGE_REQUIRED_WHEN(
        formatConditionPhrase(requiredWhen.field, requiredWhen.operator, requiredWhen.value)
      );
    }
    if (validationRules.some((rule) => rule.type === 'required')) {
      return i18n.VALIDATION_RULE_REQUIRED;
    }
    if (validationRules.some((rule) => rule.type === 'required_on_close')) {
      return i18n.ACTIONS_MENU_CONFIGURE_REQUIRED_ON_CLOSE;
    }
    return undefined;
  }, [validationRules]);

  const hiddenNote = useMemo(() => {
    const condition = conditions[0];
    if (!condition) {
      return undefined;
    }
    return i18n.ACTIONS_MENU_CONFIGURE_HIDDEN_UNTIL(
      formatConditionPhrase(condition.field, condition.operator, condition.value)
    );
  }, [conditions]);

  const subtitle = isFieldType
    ? toSentenceCase(FIELD_TYPE_TITLES[control] ?? action.label)
    : i18n.ACTIONS_MENU_CONFIGURE_LIBRARY_SUBTITLE(libraryField?.label ?? action.fieldName);

  const focusLabel = () => {
    setShowLabelError(true);
    labelInputRef.current?.focus();
  };

  const handleConfirm = useCallback(() => {
    if (isFieldType && !hasLabel) {
      focusLabel();
      return;
    }
    if (!canSubmit) {
      if (isFieldType && !hasLabel) {
        focusLabel();
      }
      return;
    }
    if (isFieldType) {
      onConfirm({
        fieldObject: omitEmptyBlocks({
          ...(previewField ?? {}),
          name: effectiveName,
          label: label.trim(),
        }),
        displayName: label.trim(),
      });
      return;
    }
    const validation: Record<string, unknown> = {};
    for (const rule of validationRules) {
      if (rule.type === 'required') {
        validation.required = true;
      } else if (rule.type === 'required_on_close') {
        validation.required_on_close = true;
      } else {
        const condition = toCondition(rule);
        if (condition) {
          validation.required_when = condition;
        }
      }
    }
    const display: Record<string, unknown> = {};
    const showWhen = conditions.map(toCondition).find((condition) => condition != null);
    if (showWhen) {
      display.show_when = showWhen;
    }
    onConfirm({
      fieldObject: omitEmptyBlocks({
        $ref: action.kind === 'libraryField' ? action.fieldName : effectiveName,
        ...(Object.keys(display).length > 0 ? { display } : {}),
        ...(Object.keys(validation).length > 0 ? { validation } : {}),
      }),
      displayName:
        action.kind === 'libraryField' ? libraryField?.label ?? action.label : effectiveName,
    });
  }, [
    action,
    canSubmit,
    conditions,
    effectiveName,
    hasLabel,
    isFieldType,
    label,
    libraryField,
    onConfirm,
    previewField,
    validationRules,
  ]);

  const addValidationRule = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.currentTarget.blur();
    setValidationRules((prev) => [
      ...prev,
      { id: nextDraftId(), type: 'required', field: '', operator: 'eq', value: '' },
    ]);
  };

  const addCondition = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.currentTarget.blur();
    setConditions((prev) => [
      ...prev,
      {
        id: nextDraftId(),
        field: siblingFieldNames[0] ?? '',
        operator: 'eq',
        value: '',
      },
    ]);
  };

  const rowMotion = css({
    animation: `configureAndAddRowIn ${euiTheme.animation.fast} ${euiTheme.animation.resistance}`,
    '@keyframes configureAndAddRowIn': {
      from: { opacity: 0 },
      to: { opacity: 1 },
    },
  });

  const sectionHeading = (title: string) => (
    <>
      <EuiSpacer size="m" />
      <EuiTitle size="xs">
        <h4>{title}</h4>
      </EuiTitle>
      <EuiSpacer size="s" />
    </>
  );

  return (
    <EuiModal
      onClose={onCancel}
      maxWidth={MODAL_WIDTH}
      style={{ width: MODAL_WIDTH }}
      aria-labelledby={modalTitleId}
      data-test-subj="configureAndAddModal"
      css={css({
        width: MODAL_WIDTH,
        maxWidth: MODAL_WIDTH,
        alignSelf: 'flex-start',
        marginTop: euiTheme.size.xxl,
        display: 'flex',
        flexDirection: 'column',
        maxHeight: 'calc(100vh - 96px)',
      })}
    >
      <EuiModalHeader>
        <div>
          <EuiModalHeaderTitle id={modalTitleId}>
            {i18n.ACTIONS_MENU_CONFIGURE_TITLE}
          </EuiModalHeaderTitle>
          <EuiText size="s" color="subdued">
            <p>{subtitle}</p>
          </EuiText>
        </div>
      </EuiModalHeader>
      <EuiModalBody
        css={css({
          flex: '1 1 auto',
          minHeight: 0,
          maxHeight: 'min(70vh, 640px)',
          overflowY: 'auto',
        })}
      >
        <EuiForm
          component="form"
          onSubmit={(event) => {
            event.preventDefault();
            handleConfirm();
          }}
        >
          {isFieldType ? (
            <>
              <EuiFormRow
                label={i18n.ACTIONS_MENU_CONFIGURE_LABEL_LABEL}
                isInvalid={showLabelError}
                error={showLabelError ? i18n.ACTIONS_MENU_CONFIGURE_LABEL_REQUIRED : undefined}
                helpText={
                  nameOverridden ? undefined : (
                    <span>
                      {hasLabel
                        ? i18n.ACTIONS_MENU_CONFIGURE_KEY_HELP(effectiveName)
                        : i18n.ACTIONS_MENU_CONFIGURE_KEY_EMPTY}{' '}
                      {hasLabel ? (
                        <EuiButtonEmpty
                          size="xs"
                          flush="both"
                          onClick={() => {
                            setName(effectiveName);
                            setNameOverridden(true);
                          }}
                          data-test-subj="configureAndAdd-editKey"
                        >
                          {i18n.ACTIONS_MENU_CONFIGURE_EDIT_KEY}
                        </EuiButtonEmpty>
                      ) : null}
                    </span>
                  )
                }
              >
                <EuiFieldText
                  isInvalid={showLabelError}
                  autoFocus
                  compressed
                  value={label}
                  placeholder={i18n.ACTIONS_MENU_CONFIGURE_LABEL_PLACEHOLDER}
                  onChange={(event) => handleLabelChange(event.target.value)}
                  inputRef={(node) => {
                    labelInputRef.current = node;
                  }}
                  data-test-subj="configureAndAdd-label"
                />
              </EuiFormRow>
              {nameOverridden ? (
                <EuiFormRow
                  label={i18n.ACTIONS_MENU_CONFIGURE_NAME_LABEL}
                  isInvalid={keyIsTaken}
                  error={
                    keyIsTaken ? i18n.ACTIONS_MENU_CONFIGURE_NAME_TAKEN(effectiveName) : undefined
                  }
                >
                  <EuiFieldText
                    isInvalid={keyIsTaken}
                    compressed
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    data-test-subj="configureAndAdd-name"
                  />
                </EuiFormRow>
              ) : null}
              {OPTIONS_CONTROLS.has(control) ? (
                <EuiFormRow
                  label={i18n.ACTIONS_MENU_CONFIGURE_OPTIONS_LABEL}
                  helpText={i18n.ACTIONS_MENU_CONFIGURE_OPTIONS_HELP}
                >
                  <EuiFieldText
                    compressed
                    value={optionsText}
                    onChange={(event) => setOptionsText(event.target.value)}
                    data-test-subj="configureAndAdd-options"
                  />
                </EuiFormRow>
              ) : null}
              {control === FieldType.TOGGLE ? (
                <EuiFormRow label={i18n.ACTIONS_MENU_CONFIGURE_DEFAULT_LABEL}>
                  <EuiSwitch
                    showLabel={false}
                    label={i18n.ACTIONS_MENU_CONFIGURE_DEFAULT_LABEL}
                    checked={toggleDefault}
                    onChange={(event) => setToggleDefault(event.target.checked)}
                    compressed
                    data-test-subj="configureAndAdd-toggleDefault"
                  />
                </EuiFormRow>
              ) : null}
            </>
          ) : (
            <>
              <EuiFormRow label={i18n.ACTIONS_MENU_CONFIGURE_LABEL_LABEL}>
                <EuiFieldText
                  compressed
                  readOnly
                  value={libraryField?.label ?? action.label}
                  data-test-subj="configureAndAdd-libraryLabel"
                />
              </EuiFormRow>
              <EuiFormRow label={i18n.ACTIONS_MENU_CONFIGURE_LIBRARY_KEY}>
                <EuiFieldText
                  compressed
                  readOnly
                  value={action.kind === 'libraryField' ? action.fieldName : ''}
                  data-test-subj="configureAndAdd-libraryKey"
                />
              </EuiFormRow>
              <EuiFormRow label={i18n.ACTIONS_MENU_CONFIGURE_LIBRARY_TYPE}>
                <EuiFieldText
                  compressed
                  readOnly
                  value={FIELD_TYPE_TITLES[control] ?? control}
                  data-test-subj="configureAndAdd-libraryType"
                />
              </EuiFormRow>
              {action.kind === 'libraryField' && action.fieldDescription ? (
                <EuiText size="s" color="subdued">
                  <p>{action.fieldDescription}</p>
                </EuiText>
              ) : null}
            </>
          )}

          {sectionHeading(i18n.ACTION_VALIDATION_TITLE)}
          {validationRules.map((rule) => (
            <div key={rule.id} css={rowMotion}>
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap={false}>
                <EuiFlexItem grow={false}>
                  <EuiSelect
                    compressed
                    options={VALIDATION_TYPE_OPTIONS}
                    value={rule.type}
                    onChange={(event) =>
                      setValidationRules((prev) =>
                        prev.map((item) =>
                          item.id === rule.id
                            ? {
                                ...item,
                                type: event.target.value as ValidationRuleType,
                                field:
                                  event.target.value === 'required_when' && !item.field
                                    ? siblingFieldNames[0] ?? ''
                                    : item.field,
                              }
                            : item
                        )
                      )
                    }
                    aria-label={i18n.ACTION_VALIDATION_TITLE}
                    data-test-subj={`configureAndAdd-validationType-${rule.id}`}
                  />
                </EuiFlexItem>
                {rule.type === 'required_when' ? (
                  <ConditionInputs
                    field={rule.field}
                    operator={rule.operator}
                    value={rule.value}
                    fieldOptions={fieldSelectOptions}
                    fieldDisabled={!canUseConditions}
                    onFieldChange={(field) =>
                      setValidationRules((prev) =>
                        prev.map((item) => (item.id === rule.id ? { ...item, field } : item))
                      )
                    }
                    onOperatorChange={(operator) =>
                      setValidationRules((prev) =>
                        prev.map((item) => (item.id === rule.id ? { ...item, operator } : item))
                      )
                    }
                    onValueChange={(value) =>
                      setValidationRules((prev) =>
                        prev.map((item) => (item.id === rule.id ? { ...item, value } : item))
                      )
                    }
                  />
                ) : null}
                <EuiFlexItem grow={false}>
                  <EuiToolTip
                    content={i18n.ACTIONS_MENU_CONFIGURE_REMOVE_RULE}
                    disableScreenReaderOutput
                  >
                    <EuiButtonIcon
                      iconType="trash"
                      color="danger"
                      display="empty"
                      aria-label={i18n.ACTIONS_MENU_CONFIGURE_REMOVE_RULE}
                      onClick={() =>
                        setValidationRules((prev) => prev.filter((item) => item.id !== rule.id))
                      }
                    />
                  </EuiToolTip>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="s" />
            </div>
          ))}
          <EuiButtonEmpty
            size="s"
            iconType="plusCircle"
            onClick={addValidationRule}
            autoFocus={!isFieldType}
            data-test-subj="configureAndAdd-addRule"
          >
            {i18n.ACTIONS_MENU_CONFIGURE_ADD_RULE}
          </EuiButtonEmpty>

          {sectionHeading(i18n.ACTION_CONDITIONAL_TITLE)}
          {!canUseConditions ? (
            <EuiText size="s" color="subdued">
              <p>{i18n.ACTIONS_MENU_CONFIGURE_NO_FIELDS_FOR_CONDITION}</p>
            </EuiText>
          ) : (
            conditions.map((condition) => (
              <div key={condition.id} css={rowMotion}>
                <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap={false}>
                  <ConditionInputs
                    field={condition.field}
                    operator={condition.operator}
                    value={condition.value}
                    fieldOptions={fieldSelectOptions}
                    onFieldChange={(field) =>
                      setConditions((prev) =>
                        prev.map((item) => (item.id === condition.id ? { ...item, field } : item))
                      )
                    }
                    onOperatorChange={(operator) =>
                      setConditions((prev) =>
                        prev.map((item) =>
                          item.id === condition.id ? { ...item, operator } : item
                        )
                      )
                    }
                    onValueChange={(value) =>
                      setConditions((prev) =>
                        prev.map((item) => (item.id === condition.id ? { ...item, value } : item))
                      )
                    }
                  />
                  <EuiFlexItem grow={false}>
                    <EuiToolTip
                      content={i18n.ACTIONS_MENU_CONFIGURE_REMOVE_CONDITION}
                      disableScreenReaderOutput
                    >
                      <EuiButtonIcon
                        iconType="trash"
                        color="danger"
                        display="empty"
                        aria-label={i18n.ACTIONS_MENU_CONFIGURE_REMOVE_CONDITION}
                        onClick={() =>
                          setConditions((prev) => prev.filter((item) => item.id !== condition.id))
                        }
                      />
                    </EuiToolTip>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="s" />
              </div>
            ))
          )}
          <EuiButtonEmpty
            size="s"
            iconType="plusCircle"
            onClick={addCondition}
            isDisabled={!canUseConditions}
            data-test-subj="configureAndAdd-addCondition"
          >
            {i18n.ACTIONS_MENU_CONFIGURE_ADD_CONDITION}
          </EuiButtonEmpty>

          {sectionHeading(i18n.ACTIONS_MENU_CONFIGURE_PREVIEW)}
          <FieldDefinitionPreview
            definition={previewYaml}
            onDefaultChange={() => undefined}
            requirementBadge={requirementBadge}
            hiddenNote={hiddenNote}
          />
        </EuiForm>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onCancel} data-test-subj="configureAndAdd-cancel">
          {i18n.ACTIONS_MENU_CONFIGURE_CANCEL}
        </EuiButtonEmpty>
        <span
          onMouseDown={(event) => {
            if (canSubmit) {
              return;
            }
            event.preventDefault();
            if (isFieldType && !hasLabel) {
              focusLabel();
            }
          }}
        >
          <EuiButton
            fill
            type="submit"
            onClick={handleConfirm}
            isDisabled={!canSubmit}
            data-test-subj="configureAndAdd-confirm"
          >
            {i18n.ACTIONS_MENU_CONFIGURE_CONFIRM}
          </EuiButton>
        </span>
      </EuiModalFooter>
    </EuiModal>
  );
};

ConfigureAndAddModal.displayName = 'ConfigureAndAddModal';
