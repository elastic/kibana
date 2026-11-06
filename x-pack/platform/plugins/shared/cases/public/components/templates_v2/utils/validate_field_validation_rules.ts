/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Document } from 'yaml';
import { isMap, isScalar } from 'yaml';
import { FieldType } from '../../../../common/types/domain/template/fields';
import type { EditorMarker } from './template_yaml_ast';
import {
  createOffsetToPosition,
  getFieldItemMaps,
  nodeRangeToMarkerPosition,
  parseTemplateDocument,
} from './template_yaml_ast';
import { VALIDATION_RULE_NOT_APPLICABLE } from '../translations';
import { FIELD_TYPE_TITLES } from './field_type_titles';

/**
 * Type-specific validation rules — the ones that only take effect on certain controls. The
 * always-applicable rules (`required`, `required_on_close`, `required_when`, `pattern`) are
 * deliberately not listed: they are valid on every input, so they are never flagged. In
 * particular `pattern` is enforced at runtime for every inline control (validateExtendedFields
 * calls `validatePattern` unconditionally, before the per-control branch), so flagging it as
 * text-only here would wrongly tell an author to remove a constraint that actually works.
 */
const TYPE_SPECIFIC_RULES = ['min', 'max', 'min_length', 'max_length'] as const;
type TypeSpecificRule = (typeof TYPE_SPECIFIC_RULES)[number];

const TEXT_RULES: readonly TypeSpecificRule[] = ['min_length', 'max_length'];
const NUMBER_RULES: readonly TypeSpecificRule[] = ['min', 'max'];

/**
 * The type-specific rules that actually take effect for a given control, mirroring the
 * "Validation by field type" reference: text controls honor `pattern`/length rules, number
 * controls honor `min`/`max`, and every other control honors none of them.
 */
export const getApplicableTypeSpecificRules = (control: string): readonly TypeSpecificRule[] => {
  switch (control) {
    case FieldType.INPUT_TEXT:
    case FieldType.TEXTAREA:
      return TEXT_RULES;
    case FieldType.INPUT_NUMBER:
      return NUMBER_RULES;
    case FieldType.SELECT_BASIC:
    case FieldType.RADIO_GROUP:
    case FieldType.CHECKBOX_GROUP:
    case FieldType.DATE_PICKER:
    case FieldType.TOGGLE:
    case FieldType.USER_PICKER:
    case FieldType.MARKDOWN:
      return [];
    default:
      // Unknown control — the schema layer already flags it; don't pile on rule warnings.
      return TYPE_SPECIFIC_RULES;
  }
};

const isKnownControl = (control: unknown): control is string =>
  typeof control === 'string' && (Object.values(FieldType) as string[]).includes(control);

/**
 * Flags validation rules that have no effect on a field's control type — e.g. `min_length` on a
 * Number or `min` on a Text field. Today these are silently ignored (a documented gotcha), so an
 * author can believe a constraint is enforced when it is not. We surface each as a warning on the
 * offending rule key so the mistake is visible in the editor.
 */
export const getInapplicableValidationRuleMarkers = (
  yamlContent: string,
  // Shares the semantic-validation hook's single parsed Document to avoid re-parsing per keystroke;
  // callers that pass only the string re-parse here.
  preparsedDoc?: Document.Parsed
): EditorMarker[] => {
  const doc = preparsedDoc ?? parseTemplateDocument(yamlContent);
  if (!doc) {
    return [];
  }

  const fieldItems = getFieldItemMaps(doc);
  if (fieldItems.length === 0) {
    return [];
  }

  const toPosition = createOffsetToPosition(yamlContent);
  const markers: EditorMarker[] = [];

  const isInapplicableRule = (ruleName: string, applicable: readonly TypeSpecificRule[]): boolean =>
    (TYPE_SPECIFIC_RULES as readonly string[]).includes(ruleName) &&
    !(applicable as readonly string[]).includes(ruleName);

  for (const field of fieldItems) {
    const control = field.get('control');
    const validation = field.get('validation', true);

    if (isKnownControl(control) && isMap(validation)) {
      const applicable = getApplicableTypeSpecificRules(control);
      const shouldCheck = applicable.length !== TYPE_SPECIFIC_RULES.length;

      if (shouldCheck) {
        for (const pair of validation.items) {
          const keyNode = pair.key;
          if (
            isScalar(keyNode) &&
            typeof keyNode.value === 'string' &&
            isInapplicableRule(keyNode.value, applicable)
          ) {
            const position = nodeRangeToMarkerPosition(keyNode, toPosition);
            if (position) {
              markers.push({
                ...position,
                message: VALIDATION_RULE_NOT_APPLICABLE(
                  keyNode.value,
                  FIELD_TYPE_TITLES[control] ?? control
                ),
                severity: 'warning',
              });
            }
          }
        }
      }
    }
  }

  return markers;
};
