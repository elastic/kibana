/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getApplicableTypeSpecificRules } from './validate_field_validation_rules';
import * as i18n from '../translations';

/**
 * The Validation and Conditional-logic entries the Actions menu offers for a field. Each entry knows
 * which block it writes to (`validation` / `display`), the rule key, and a scaffold value the author
 * then edits. `applyFieldBlock` (template_field_actions) consumes `blockKey`/`ruleKey`/`value`.
 */
export interface FieldRuleAction {
  id: string;
  label: string;
  blockKey: 'validation' | 'display';
  ruleKey: string;
  value: unknown;
}

// A conditation scaffold referencing another field — the author fills in the real field/value.
const CONDITION_SCAFFOLD = { field: 'field_name', operator: 'eq', value: 'value' } as const;

// Always-valid validation rules (enforced at runtime for every inline control, so never gated by
// control type). `pattern` belongs here: validateExtendedFields runs it for all controls.
const ALWAYS_APPLICABLE_VALIDATION: FieldRuleAction[] = [
  {
    id: 'required',
    label: i18n.VALIDATION_RULE_REQUIRED,
    blockKey: 'validation',
    ruleKey: 'required',
    value: true,
  },
  {
    id: 'required_on_close',
    label: i18n.VALIDATION_RULE_REQUIRED_ON_CLOSE,
    blockKey: 'validation',
    ruleKey: 'required_on_close',
    value: true,
  },
  {
    id: 'pattern',
    label: i18n.VALIDATION_RULE_PATTERN,
    blockKey: 'validation',
    // Placeholder scaffold values the author replaces (like `field_name`/`value` below) — not
    // finished, user-facing copy, so they are intentionally not translated. `error_message` reads
    // as an obvious "edit me" token rather than a shippable default.
    ruleKey: 'pattern',
    value: { regex: '.*', message: 'error_message' },
  },
];

// Scaffold value + label for each control-gated (type-specific) validation rule.
const TYPE_SPECIFIC_VALIDATION: Record<string, Omit<FieldRuleAction, 'blockKey'>> = {
  min: { id: 'min', label: i18n.VALIDATION_RULE_MIN, ruleKey: 'min', value: 0 },
  max: { id: 'max', label: i18n.VALIDATION_RULE_MAX, ruleKey: 'max', value: 100 },
  min_length: {
    id: 'min_length',
    label: i18n.VALIDATION_RULE_MIN_LENGTH,
    ruleKey: 'min_length',
    value: 1,
  },
  max_length: {
    id: 'max_length',
    label: i18n.VALIDATION_RULE_MAX_LENGTH,
    ruleKey: 'max_length',
    value: 255,
  },
};

/**
 * The validation rules worth offering for a control: the always-valid rules plus the type-specific
 * rules that actually take effect at runtime for that control (mirrors the editor's inapplicable-rule
 * validator, so the menu never scaffolds a rule the validator would then flag).
 */
export const getValidationActions = (control: string): FieldRuleAction[] => {
  const typeSpecific = getApplicableTypeSpecificRules(control)
    .map((rule) => TYPE_SPECIFIC_VALIDATION[rule])
    .filter((action): action is Omit<FieldRuleAction, 'blockKey'> => action != null)
    .map((action) => ({ ...action, blockKey: 'validation' as const }));

  return [...ALWAYS_APPLICABLE_VALIDATION, ...typeSpecific];
};

/**
 * Conditional-logic entries — control-independent. `show_when` lives under `display`; `required_when`
 * lives under `validation` (it is a condition, so it is grouped here rather than under Validation).
 */
export const getConditionalLogicActions = (): FieldRuleAction[] => [
  {
    id: 'show_when',
    label: i18n.CONDITION_SHOW_WHEN,
    blockKey: 'display',
    ruleKey: 'show_when',
    value: { ...CONDITION_SCAFFOLD },
  },
  {
    id: 'show_when_compound',
    label: i18n.CONDITION_SHOW_WHEN_COMPOUND,
    blockKey: 'display',
    ruleKey: 'show_when',
    value: { combine: 'all', rules: [{ ...CONDITION_SCAFFOLD }] },
  },
  {
    id: 'required_when',
    label: i18n.CONDITION_REQUIRED_WHEN,
    blockKey: 'validation',
    ruleKey: 'required_when',
    value: { ...CONDITION_SCAFFOLD },
  },
];
