/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectableOption, IconType } from '@elastic/eui';
import type { FieldRuleAction } from '../../utils/field_action_catalog';

export type ActionKind = 'category' | 'fieldType' | 'libraryField' | 'rule';

/** Colored tile variants for root category icons (Workflows-style). */
export type IconVariant = 'platform' | 'library' | 'validation' | 'conditional';

interface ActionBase {
  id: string;
  label: string;
  description?: string;
  disabled?: boolean;
  /** Shown in the row (and accessible name) when the item is disabled. */
  disabledReason?: string;
  /**
   * Ids from the root menu down through this row (for categories: path to open this group).
   * Set in `getActionOptions` for O(1) navigation when selecting from search.
   */
  pathIds?: readonly string[];
  /** Stable test id for the left-list row (e.g. `templateActionsMenu-validation`). */
  testSubj?: string;
  /** Root-category icon glyph (home page only). */
  iconType?: IconType;
  iconVariant?: IconVariant;
}

export interface ActionCategory extends ActionBase {
  kind: 'category';
  options: ActionOptionData[];
}

export interface FieldTypeAction extends ActionBase {
  kind: 'fieldType';
  control: string;
  /** Plain scaffold object ready for insert (placeholders already stripped). */
  scaffold: Record<string, unknown>;
}

export interface LibraryFieldAction extends ActionBase {
  kind: 'libraryField';
  fieldName: string;
  alreadyLinked?: boolean;
  isGlobal?: boolean;
  /** YAML of the library field's inline definition, used by Configure and add. */
  definition?: string;
  fieldDescription?: string;
}

export interface RuleActionOption extends ActionBase {
  kind: 'rule';
  rule: FieldRuleAction;
}

export type ActionOptionData =
  | ActionCategory
  | FieldTypeAction
  | LibraryFieldAction
  | RuleActionOption;

/** Leaves that support Add / Configure and add. */
export type ConfigurableFieldAction = FieldTypeAction | LibraryFieldAction;

export const isActionCategory = (option: ActionOptionData): option is ActionCategory =>
  option.kind === 'category';

export const isLeafAction = (option: ActionOptionData): boolean => option.kind !== 'category';

export const isConfigurableFieldAction = (
  option: ActionOptionData
): option is ConfigurableFieldAction =>
  option.kind === 'fieldType' || option.kind === 'libraryField';

/**
 * Options passed to EuiSelectable carry ActionOptionData inside the standard `data` bag. EUI strips
 * `data` from DOM props and spreads its contents into the object handed to `renderOption`, so:
 *   - in renderOption:  (option as any).action   ← spread from data
 *   - in onChange:       (option as any).data.action  ← original object
 * Use {@link getOptionAction} to abstract over both contexts.
 */
export type MenuSelectableOption = EuiSelectableOption & {
  data?: { action: ActionOptionData };
};

export const getOptionAction = (option: EuiSelectableOption): ActionOptionData | undefined => {
  const o = option as unknown as Record<string, unknown>;
  return (
    (o.action as ActionOptionData | undefined) ??
    ((o.data as Record<string, unknown> | undefined)?.action as ActionOptionData | undefined)
  );
};
