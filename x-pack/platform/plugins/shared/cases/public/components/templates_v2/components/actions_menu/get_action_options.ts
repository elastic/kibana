/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FIELD_DEFAULT_SNIPPETS } from '../../utils/template_field_snippets';
import { buildFieldScaffold } from '../../utils/template_field_actions';
import { getConditionalLogicActions, getValidationActions } from '../../utils/field_action_catalog';
import * as i18n from '../../translations';
import type {
  ActionCategory,
  ActionOptionData,
  FieldTypeAction,
  LibraryFieldAction,
  RuleActionOption,
} from './types';

export interface LibraryFieldEntry {
  fieldDefinitionId: string;
  name: string;
  isGlobal?: boolean;
  definition?: string;
  description?: string;
}

export interface GetActionOptionsParams {
  mode: 'template' | 'fieldDefinition';
  bufferHasErrors: boolean;
  hasTargetField: boolean;
  targetControl?: string;
  libraryFields: LibraryFieldEntry[];
  alreadyLinked: Set<string>;
  isLibraryLoading: boolean;
}

const CATEGORY_IDS = {
  newField: 'newField',
  fieldLibrary: 'fieldLibrary',
  validation: 'validation',
  conditional: 'conditional',
} as const;

const withPath = <T extends ActionOptionData>(
  option: T,
  parentPath: readonly string[]
): T => ({
  ...option,
  pathIds: [...parentPath, option.id],
});

const buildFieldTypeOptions = (parentPath: readonly string[]): FieldTypeAction[] =>
  FIELD_DEFAULT_SNIPPETS.filter(
    (snippet) => typeof (snippet.body as { control?: unknown }).control === 'string'
  ).map((snippet) => {
    const control = (snippet.body as { control: string }).control;
    const scaffold = buildFieldScaffold(control) ?? {};
    return withPath(
      {
        kind: 'fieldType' as const,
        id: `fieldType:${control}`,
        label: snippet.label,
        description: snippet.description,
        control,
        scaffold,
        testSubj: `newField-${control}`,
      },
      parentPath
    );
  });

const buildLibraryOptions = (
  parentPath: readonly string[],
  libraryFields: LibraryFieldEntry[],
  alreadyLinked: Set<string>
): LibraryFieldAction[] =>
  libraryFields.map((field) => {
    const linked = alreadyLinked.has(field.name);
    return withPath(
      {
        kind: 'libraryField' as const,
        id: `library:${field.fieldDefinitionId}`,
        label: field.name,
        description: linked ? i18n.ACTIONS_MENU_FIELD_EXISTS(field.name) : undefined,
        fieldName: field.name,
        alreadyLinked: linked,
        isGlobal: field.isGlobal,
        definition: field.definition,
        fieldDescription: field.description,
        disabled: linked,
        disabledReason: linked ? i18n.ACTIONS_MENU_FIELD_EXISTS(field.name) : undefined,
        testSubj: `fieldLibrary-${field.name}`,
      },
      parentPath
    );
  });

const buildRuleOptions = (
  parentPath: readonly string[],
  rules: ReturnType<typeof getValidationActions>,
  testSubjPrefix: string
): RuleActionOption[] =>
  rules.map((rule) =>
    withPath(
      {
        kind: 'rule' as const,
        id: `rule:${rule.id}`,
        label: rule.label,
        rule,
        testSubj: `${testSubjPrefix}-${rule.id}`,
      },
      parentPath
    )
  );

/**
 * Builds the hierarchical Actions catalog for the template / field-definition editors.
 * Categories mirror the previous EuiContextMenu panels; leaves map 1:1 onto insert/apply actions.
 */
export const getActionOptions = ({
  mode,
  bufferHasErrors,
  hasTargetField,
  targetControl,
  libraryFields,
  alreadyLinked,
  isLibraryLoading,
}: GetActionOptionsParams): ActionOptionData[] => {
  const isFieldDefinition = mode === 'fieldDefinition';
  const insertDisabled = bufferHasErrors;
  const insertDisabledReason = bufferHasErrors ? i18n.ACTIONS_MENU_FIX_YAML_FIRST : undefined;
  const ruleDisabled = bufferHasErrors || !hasTargetField;
  const ruleDisabledReason = bufferHasErrors
    ? i18n.ACTIONS_MENU_FIX_YAML_FIRST
    : isFieldDefinition
    ? i18n.ACTIONS_MENU_NO_FIELD_YET
    : i18n.ACTIONS_MENU_SELECT_A_FIELD;

  const newFieldTitle =
    isFieldDefinition && hasTargetField
      ? i18n.ACTION_CHANGE_FIELD_TYPE_TITLE
      : i18n.ACTION_NEW_FIELD_TITLE;
  const newFieldDesc =
    isFieldDefinition && hasTargetField
      ? i18n.ACTION_CHANGE_FIELD_TYPE_DESC
      : i18n.ACTION_NEW_FIELD_DESC;

  const newFieldPath = [CATEGORY_IDS.newField] as const;
  const newFieldCategory: ActionCategory = {
    kind: 'category',
    id: CATEGORY_IDS.newField,
    label: newFieldTitle,
    description: insertDisabled ? insertDisabledReason : newFieldDesc,
    disabled: insertDisabled,
    disabledReason: insertDisabledReason,
    pathIds: newFieldPath,
    testSubj: CATEGORY_IDS.newField,
    iconType: 'plusCircle',
    iconVariant: 'platform',
    options: buildFieldTypeOptions(newFieldPath),
  };

  const options: ActionOptionData[] = [newFieldCategory];

  if (!isFieldDefinition) {
    const libraryPath = [CATEGORY_IDS.fieldLibrary] as const;
    const libraryChildren = isLibraryLoading
      ? []
      : buildLibraryOptions(libraryPath, libraryFields, alreadyLinked);
    options.push({
      kind: 'category',
      id: CATEGORY_IDS.fieldLibrary,
      label: i18n.ACTION_FIELD_LIBRARY_TITLE,
      description: insertDisabled ? insertDisabledReason : i18n.ACTION_FIELD_LIBRARY_DESC,
      disabled: insertDisabled,
      disabledReason: insertDisabledReason,
      pathIds: libraryPath,
      testSubj: CATEGORY_IDS.fieldLibrary,
      iconType: 'indexOpen',
      iconVariant: 'library',
      options: libraryChildren,
    });
  }

  const validationPath = [CATEGORY_IDS.validation] as const;
  const validationRules = hasTargetField && targetControl ? getValidationActions(targetControl) : [];
  options.push({
    kind: 'category',
    id: CATEGORY_IDS.validation,
    label: i18n.ACTION_VALIDATION_TITLE,
    description: ruleDisabled ? ruleDisabledReason : i18n.ACTION_VALIDATION_DESC,
    disabled: ruleDisabled,
    disabledReason: ruleDisabledReason,
    pathIds: validationPath,
    testSubj: CATEGORY_IDS.validation,
    iconType: 'checkCircleFill',
    iconVariant: 'validation',
    options: buildRuleOptions(validationPath, validationRules, 'validation'),
  });

  if (!isFieldDefinition) {
    const conditionalPath = [CATEGORY_IDS.conditional] as const;
    options.push({
      kind: 'category',
      id: CATEGORY_IDS.conditional,
      label: i18n.ACTION_CONDITIONAL_TITLE,
      description: ruleDisabled ? ruleDisabledReason : i18n.ACTION_CONDITIONAL_DESC,
      disabled: ruleDisabled,
      disabledReason: ruleDisabledReason,
      pathIds: conditionalPath,
      testSubj: CATEGORY_IDS.conditional,
      iconType: 'branch',
      iconVariant: 'conditional',
      options: buildRuleOptions(conditionalPath, getConditionalLogicActions(), 'conditional'),
    });
  }

  return options;
};

/** Depth-first flatten of every actionable node (categories + leaves). */
export const flattenOptions = (options: ActionOptionData[]): ActionOptionData[] => {
  const result: ActionOptionData[] = [];
  const walk = (nodes: ActionOptionData[]) => {
    for (const node of nodes) {
      result.push(node);
      if (node.kind === 'category') {
        walk(node.options);
      }
    }
  };
  walk(options);
  return result;
};

export { CATEGORY_IDS };
