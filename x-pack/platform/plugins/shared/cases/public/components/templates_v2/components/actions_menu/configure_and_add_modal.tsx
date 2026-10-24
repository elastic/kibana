/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useRef, useState } from 'react';
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
import type {
  Condition,
  ConditionRule,
  Display,
  InlineField,
  Validation,
} from '../../../../../common/types/domain/template/fields';
import {
  FIELD_OPTIONS_MAX_ITEMS,
  FIELD_OPTIONS_MIN_ITEMS,
} from '../../../../../common/types/domain/template/translations';
import { MAX_SNAKE_KEY_LENGTH } from '../../../../../common/constants';
import {
  applyRefFieldOverride,
  getAuthorableFieldNameViolation,
  getFieldSnakeKey,
  getFoldedFieldName,
} from '../../../../../common/utils/template_fields';
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

type ConditionOperator = ConditionRule['operator'];

export interface ConditionDraft {
  id: string;
  field: string;
  operator: ConditionOperator;
  value: string;
}

type RequirementType = 'required' | 'required_on_close' | 'required_when';

export interface RequirementDraft extends ConditionDraft {
  type: RequirementType;
}

const OPTIONS_LIMITS: Readonly<Record<string, { min: number; max: number }>> = {
  [FieldType.SELECT_BASIC]: { min: 1, max: Infinity },
  [FieldType.RADIO_GROUP]: { min: 2, max: 20 },
  [FieldType.CHECKBOX_GROUP]: { min: 1, max: 30 },
};

const OPERATOR_OPTIONS: Array<{ value: ConditionOperator; text: string }> = [
  { value: 'eq', text: i18n.ACTIONS_MENU_CONFIGURE_OPERATOR_EQ },
  { value: 'neq', text: i18n.ACTIONS_MENU_CONFIGURE_OPERATOR_NEQ },
  { value: 'contains', text: i18n.ACTIONS_MENU_CONFIGURE_OPERATOR_CONTAINS },
  { value: 'empty', text: i18n.ACTIONS_MENU_CONFIGURE_OPERATOR_EMPTY },
  { value: 'not_empty', text: i18n.ACTIONS_MENU_CONFIGURE_OPERATOR_NOT_EMPTY },
];

const MODAL_WIDTH = 640;

// Room kept for the `_N` suffix appended when the slug is already taken.
const UNIQUE_SUFFIX_RESERVE = 4;

let draftId = 0;
const nextDraftId = (): string => {
  draftId += 1;
  return `draft-${draftId}`;
};

const isValuelessOperator = (operator: ConditionOperator): boolean =>
  operator === 'empty' || operator === 'not_empty';

/**
 * Derives an authorable field name from a label: only `[a-z0-9_]`, and short enough that the
 * `${name}_as_${type}` storage key stays within `MAX_SNAKE_KEY_LENGTH` even after a uniqueness
 * suffix is appended.
 */
export const slugifyFieldName = (label: string, type: string): string => {
  const maxLength =
    MAX_SNAKE_KEY_LENGTH - getFieldSnakeKey('', type).length - UNIQUE_SUFFIX_RESERVE;
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .slice(0, maxLength)
    .replace(/^_+|_+$/g, '');
  return slug.length > 0 ? slug : 'field';
};

/**
 * Maps each existing name's camelCase fold to the name, so a new name that folds onto an existing
 * one (`my_field` vs `myField`) can be rejected — Kibana reads both through the same key.
 */
const buildFoldedNameIndex = (names: ReadonlySet<string>): ReadonlyMap<string, string> =>
  new Map(Array.from(names, (name) => [getFoldedFieldName(name), name] as const));

const isNameTaken = (
  name: string,
  existing: ReadonlySet<string>,
  foldedIndex: ReadonlyMap<string, string>
): boolean => existing.has(name) || foldedIndex.has(getFoldedFieldName(name));

export const getAvailableFieldName = (base: string, existing: ReadonlySet<string>): string => {
  const foldedIndex = buildFoldedNameIndex(existing);
  if (!isNameTaken(base, existing, foldedIndex)) {
    return base;
  }
  let counter = 2;
  while (isNameTaken(`${base}_${counter}`, existing, foldedIndex)) {
    counter += 1;
  }
  return `${base}_${counter}`;
};

export const getFieldNameError = (
  name: string,
  type: string,
  existing: ReadonlySet<string>
): string | undefined => {
  if (!name) {
    return undefined;
  }
  const violation = getAuthorableFieldNameViolation(name, type);
  if (violation === 'charset') {
    return i18n.ACTIONS_MENU_CONFIGURE_NAME_CHARSET(name);
  }
  if (violation === 'length') {
    return i18n.ACTIONS_MENU_CONFIGURE_NAME_TOO_LONG(name, MAX_SNAKE_KEY_LENGTH);
  }
  if (existing.has(name)) {
    return i18n.ACTIONS_MENU_CONFIGURE_NAME_TAKEN(name);
  }
  const twin = buildFoldedNameIndex(existing).get(getFoldedFieldName(name));
  return twin !== undefined ? i18n.ACTIONS_MENU_CONFIGURE_NAME_FOLDED_TWIN(name, twin) : undefined;
};

const parseOptions = (text: string): string[] =>
  Array.from(
    new Set(
      text
        .split(',')
        .map((option) => option.trim())
        .filter((option) => option.length > 0)
    )
  );

const getOptionsError = (control: string, options: string[]): string | undefined => {
  const limits = OPTIONS_LIMITS[control];
  if (!limits) {
    return undefined;
  }
  if (options.length < limits.min) {
    return FIELD_OPTIONS_MIN_ITEMS(limits.min);
  }
  if (options.length > limits.max) {
    return FIELD_OPTIONS_MAX_ITEMS(limits.max);
  }
  return undefined;
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

const toConditionRule = (draft: ConditionDraft): ConditionRule | null => {
  if (!draft.field) {
    return null;
  }
  return isValuelessOperator(draft.operator)
    ? { field: draft.field, operator: draft.operator }
    : { field: draft.field, operator: draft.operator, value: draft.value };
};

const combineConditions = (drafts: ConditionDraft[]): Condition | undefined => {
  const rules = drafts.map(toConditionRule).filter((rule): rule is ConditionRule => rule != null);
  if (rules.length === 0) {
    return undefined;
  }
  return rules.length === 1 ? rules[0] : { combine: 'all', rules };
};

export interface ConfiguredRules {
  validation?: Validation;
  display?: Display;
}

/**
 * The single source for what Configure and add writes: the inserted YAML, the preview and the
 * requirement badge are all derived from this, so they cannot disagree.
 */
export const buildConfiguredRules = (
  requirements: RequirementDraft[],
  conditions: ConditionDraft[]
): ConfiguredRules => {
  let validation: Validation | undefined;
  if (requirements.some((rule) => rule.type === 'required')) {
    validation = { required: true };
  } else if (requirements.some((rule) => rule.type === 'required_on_close')) {
    validation = { required_on_close: true };
  } else {
    const requiredWhen = combineConditions(
      requirements.filter((rule) => rule.type === 'required_when')
    );
    validation = requiredWhen ? { required_when: requiredWhen } : undefined;
  }
  const showWhen = combineConditions(conditions);
  return {
    ...(validation ? { validation } : {}),
    ...(showWhen ? { display: { show_when: showWhen } } : {}),
  };
};

const describeRule = (rule: ConditionRule): string =>
  i18n.ACTIONS_MENU_CONFIGURE_CONDITION_PHRASE({
    field: rule.field,
    operator: rule.operator,
    value: rule.value === undefined ? '' : String(rule.value),
  });

const describeCondition = (condition: Condition): string =>
  'rules' in condition
    ? i18n.ACTIONS_MENU_CONFIGURE_CONDITIONS_JOINED(
        describeRule(condition.rules[0]),
        condition.rules.length - 1
      )
    : describeRule(condition);

export const describeRequirement = (validation?: Validation): string | undefined => {
  if (validation?.required) {
    return i18n.VALIDATION_RULE_REQUIRED;
  }
  if (validation?.required_when) {
    return i18n.ACTIONS_MENU_CONFIGURE_BADGE_REQUIRED_WHEN(
      describeCondition(validation.required_when)
    );
  }
  if (validation?.required_on_close) {
    return i18n.ACTIONS_MENU_CONFIGURE_REQUIRED_ON_CLOSE;
  }
  return undefined;
};

const omitEmptyBlocks = (field: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(field).filter(
      ([, value]) =>
        value !== undefined &&
        !(
          typeof value === 'object' &&
          value !== null &&
          !Array.isArray(value) &&
          Object.keys(value).length === 0
        )
    )
  );

interface ConditionInputsProps {
  field: string;
  operator: ConditionOperator;
  value: string;
  fieldOptions: Array<{ value: string; text: string }>;
  onFieldChange: (field: string) => void;
  onOperatorChange: (operator: ConditionOperator) => void;
  onValueChange: (value: string) => void;
}

const isConditionOperator = (value: string): value is ConditionOperator =>
  OPERATOR_OPTIONS.some((option) => option.value === value);

function ConditionInputs({
  field,
  operator,
  value,
  fieldOptions,
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
          onChange={(event) => onFieldChange(event.target.value)}
          aria-label={i18n.ACTIONS_MENU_CONFIGURE_CONDITION_FIELD}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiSelect
          compressed
          options={OPERATOR_OPTIONS}
          value={operator}
          onChange={(event) => {
            if (isConditionOperator(event.target.value)) {
              onOperatorChange(event.target.value);
            }
          }}
          aria-label={i18n.ACTIONS_MENU_CONFIGURE_CONDITION_OPERATOR}
        />
      </EuiFlexItem>
      {!isValuelessOperator(operator) ? (
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

const REQUIREMENT_TYPES: RequirementType[] = ['required', 'required_when', 'required_on_close'];

const isRequirementType = (value: string): value is RequirementType =>
  REQUIREMENT_TYPES.some((type) => type === value);

const REQUIREMENT_LABELS: Record<RequirementType, string> = {
  required: i18n.VALIDATION_RULE_REQUIRED,
  required_when: i18n.ACTIONS_MENU_CONFIGURE_REQUIRED_WHEN,
  required_on_close: i18n.ACTIONS_MENU_CONFIGURE_REQUIRED_ON_CLOSE,
};

export const ConfigureAndAddModal: React.FC<ConfigureAndAddModalProps> = ({
  action,
  existingFieldNames,
  siblingFieldNames,
  onCancel,
  onConfirm,
}) => {
  const { euiTheme } = useEuiTheme();
  const isFieldType = action.kind === 'fieldType';
  const libraryField = useMemo(
    () => (action.kind === 'libraryField' ? parseLibraryInlineField(action.definition) : null),
    [action]
  );
  const control = isFieldType ? action.control : libraryField?.control ?? FieldType.INPUT_TEXT;
  const scaffold = useMemo(
    () => (isFieldType ? buildFieldScaffold(action.control) ?? { ...action.scaffold } : {}),
    [action, isFieldType]
  );
  const storageType = typeof scaffold.type === 'string' ? scaffold.type : 'keyword';

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
  const [requirements, setRequirements] = useState<RequirementDraft[]>([]);
  const [conditions, setConditions] = useState<ConditionDraft[]>([]);
  const labelInputRef = useRef<HTMLInputElement | null>(null);

  const hasLabel = label.trim().length > 0;
  const generatedName = hasLabel
    ? getAvailableFieldName(slugifyFieldName(label, storageType), existingFieldNames)
    : '';
  const effectiveName = nameOverridden ? name.trim() : generatedName;
  const nameError = isFieldType
    ? getFieldNameError(effectiveName, storageType, existingFieldNames)
    : undefined;

  const hasOptions = isFieldType && OPTIONS_LIMITS[control] != null;
  const options = useMemo(() => parseOptions(optionsText), [optionsText]);
  const optionsError = hasOptions ? getOptionsError(control, options) : undefined;

  const canSubmit = isFieldType
    ? hasLabel && effectiveName.length > 0 && !nameError && !optionsError
    : true;

  const fieldSelectOptions = useMemo(
    () => siblingFieldNames.map((fieldName) => ({ value: fieldName, text: fieldName })),
    [siblingFieldNames]
  );
  const canUseConditions = siblingFieldNames.length > 0;
  const modalTitleId = useGeneratedHtmlId();

  const rules = useMemo(
    () => buildConfiguredRules(requirements, conditions),
    [requirements, conditions]
  );

  const fieldObject = useMemo((): Record<string, unknown> | null => {
    if (isFieldType) {
      const metadata = {
        ...((scaffold.metadata as Record<string, unknown> | undefined) ?? {}),
      };
      if (hasOptions) {
        metadata.options = options;
      }
      if (control === FieldType.TOGGLE) {
        metadata.default = toggleDefault;
      }
      return omitEmptyBlocks({
        ...scaffold,
        name: effectiveName,
        label: label.trim(),
        metadata,
        display: rules.display,
        validation: rules.validation,
      });
    }
    if (action.kind !== 'libraryField') {
      return null;
    }
    return omitEmptyBlocks({
      $ref: action.fieldName,
      display: rules.display,
      validation: rules.validation,
    });
  }, [
    action,
    control,
    effectiveName,
    hasOptions,
    isFieldType,
    label,
    options,
    rules,
    scaffold,
    toggleDefault,
  ]);

  const previewYaml = useMemo(() => {
    if (isFieldType && fieldObject) {
      return stringifyYaml({
        ...fieldObject,
        name: effectiveName || 'field',
        label: label.trim() || i18n.ACTIONS_MENU_CONFIGURE_UNTITLED,
      });
    }
    if (libraryField && action.kind === 'libraryField') {
      return stringifyYaml(
        applyRefFieldOverride(libraryField, { $ref: action.fieldName, ...rules })
      );
    }
    return '';
  }, [action, effectiveName, fieldObject, isFieldType, label, libraryField, rules]);

  const requirementBadge = describeRequirement(rules.validation);
  const hiddenNote = rules.display?.show_when
    ? i18n.ACTIONS_MENU_CONFIGURE_HIDDEN_UNTIL(describeCondition(rules.display.show_when))
    : undefined;

  const subtitle = isFieldType
    ? FIELD_TYPE_TITLES[control] ?? action.label
    : i18n.ACTIONS_MENU_CONFIGURE_LIBRARY_SUBTITLE(libraryField?.label ?? action.fieldName);

  const focusLabel = () => {
    setShowLabelError(true);
    labelInputRef.current?.focus();
  };

  const handleConfirm = () => {
    if (isFieldType && !hasLabel) {
      focusLabel();
      return;
    }
    if (!canSubmit || !fieldObject) {
      return;
    }
    onConfirm({
      fieldObject,
      displayName: isFieldType
        ? label.trim()
        : libraryField?.label ?? (action.kind === 'libraryField' ? action.label : effectiveName),
    });
  };

  const requirementType = requirements[0]?.type;
  const isExclusiveRequirement =
    requirementType === 'required' || requirementType === 'required_on_close';
  const canAddRequirement =
    requirements.length === 0 || (!isExclusiveRequirement && canUseConditions);

  const addRequirement = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.currentTarget.blur();
    setRequirements((prev) => [
      ...prev,
      {
        id: nextDraftId(),
        type: prev.length === 0 ? 'required' : 'required_when',
        field: siblingFieldNames[0] ?? '',
        operator: 'eq',
        value: '',
      },
    ]);
  };

  const changeRequirementType = (id: string, type: RequirementType) =>
    setRequirements((prev) => {
      const changed = prev.find((item) => item.id === id);
      if (!changed) {
        return prev;
      }
      const next = { ...changed, type, field: changed.field || siblingFieldNames[0] || '' };
      // Required, Required when and Required on close are mutually exclusive, so picking a plain
      // requirement replaces every other row; only Required when rows combine (all must match).
      return type === 'required_when' ? prev.map((item) => (item.id === id ? next : item)) : [next];
    });

  const updateRequirement = (id: string, patch: Partial<ConditionDraft>) =>
    setRequirements((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  const updateCondition = (id: string, patch: Partial<ConditionDraft>) =>
    setConditions((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  const requirementTypeOptions = REQUIREMENT_TYPES.map((type) => ({
    value: type,
    text: REQUIREMENT_LABELS[type],
    disabled: type === 'required_when' && !canUseConditions,
  }));

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
      aria-labelledby={modalTitleId}
      data-test-subj="configureAndAddModal"
      css={css({
        width: `min(${MODAL_WIDTH}px, calc(100vw - ${euiTheme.size.xl}))`,
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
                isInvalid={showLabelError || (!nameOverridden && nameError !== undefined)}
                error={
                  showLabelError
                    ? i18n.ACTIONS_MENU_CONFIGURE_LABEL_REQUIRED
                    : !nameOverridden
                    ? nameError
                    : undefined
                }
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
                  isInvalid={showLabelError || (!nameOverridden && nameError !== undefined)}
                  autoFocus
                  compressed
                  value={label}
                  placeholder={i18n.ACTIONS_MENU_CONFIGURE_LABEL_PLACEHOLDER}
                  onChange={(event) => {
                    setLabel(event.target.value);
                    if (event.target.value.trim()) {
                      setShowLabelError(false);
                    }
                  }}
                  inputRef={(node) => {
                    labelInputRef.current = node;
                  }}
                  data-test-subj="configureAndAdd-label"
                />
              </EuiFormRow>
              {nameOverridden ? (
                <EuiFormRow
                  label={i18n.ACTIONS_MENU_CONFIGURE_NAME_LABEL}
                  isInvalid={nameError !== undefined}
                  error={nameError}
                >
                  <EuiFieldText
                    isInvalid={nameError !== undefined}
                    compressed
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    data-test-subj="configureAndAdd-name"
                  />
                </EuiFormRow>
              ) : null}
              {hasOptions ? (
                <EuiFormRow
                  label={i18n.ACTIONS_MENU_CONFIGURE_OPTIONS_LABEL}
                  helpText={i18n.ACTIONS_MENU_CONFIGURE_OPTIONS_HELP}
                  isInvalid={optionsError !== undefined}
                  error={optionsError}
                >
                  <EuiFieldText
                    compressed
                    value={optionsText}
                    isInvalid={optionsError !== undefined}
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
          {requirements.map((rule) => (
            <div key={rule.id} css={rowMotion}>
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap={false}>
                <EuiFlexItem grow={false}>
                  <EuiSelect
                    compressed
                    options={requirementTypeOptions}
                    value={rule.type}
                    onChange={(event) => {
                      if (isRequirementType(event.target.value)) {
                        changeRequirementType(rule.id, event.target.value);
                      }
                    }}
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
                    onFieldChange={(field) => updateRequirement(rule.id, { field })}
                    onOperatorChange={(operator) => updateRequirement(rule.id, { operator })}
                    onValueChange={(value) => updateRequirement(rule.id, { value })}
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
                        setRequirements((prev) => prev.filter((item) => item.id !== rule.id))
                      }
                    />
                  </EuiToolTip>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="s" />
            </div>
          ))}
          {!canUseConditions && requirements.length > 0 ? (
            <EuiText size="xs" color="subdued">
              <p>{i18n.ACTIONS_MENU_CONFIGURE_NO_FIELDS_FOR_REQUIRED_WHEN}</p>
            </EuiText>
          ) : null}
          <EuiButtonEmpty
            size="s"
            iconType="plusCircle"
            onClick={addRequirement}
            isDisabled={!canAddRequirement}
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
                    onFieldChange={(field) => updateCondition(condition.id, { field })}
                    onOperatorChange={(operator) => updateCondition(condition.id, { operator })}
                    onValueChange={(value) => updateCondition(condition.id, { value })}
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
