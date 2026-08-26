/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Document, Scalar, YAMLMap } from 'yaml';
import { isMap, isSeq, isScalar } from 'yaml';
import type { EditorMarker } from './template_yaml_ast';
import {
  createOffsetToPosition,
  getDefinedFieldNames,
  getFieldItemMaps,
  nodeRangeToMarkerPosition,
  parseTemplateDocument,
} from './template_yaml_ast';
import { CONDITION_UNKNOWN_FIELD } from '../translations';

/**
 * Returns the `field:` reference scalars from a condition node. A condition is either a single rule
 * (`{ field, operator, value }`) or a compound group (`{ combine, rules: [...] }`); we collect the
 * `field` scalar from the single rule or from every rule in the group.
 */
const collectFieldReferenceScalars = (conditionNode: unknown): Scalar[] => {
  if (!isMap(conditionNode)) {
    return [];
  }

  const rulesNode = (conditionNode as YAMLMap).get('rules', true);
  if (isSeq(rulesNode)) {
    return rulesNode.items.reduce<Scalar[]>((acc, ruleItem) => {
      if (isMap(ruleItem)) {
        const fieldScalar = ruleItem.get('field', true);
        if (isScalar(fieldScalar)) {
          acc.push(fieldScalar);
        }
      }
      return acc;
    }, []);
  }

  const fieldScalar = (conditionNode as YAMLMap).get('field', true);
  return isScalar(fieldScalar) ? [fieldScalar] : [];
};

/**
 * Flags `display.show_when` / `validation.required_when` rules that reference a field name which
 * does not exist in the template. This is the documented gotcha where a typo'd `field` raises no
 * error and the rule silently evaluates to `true` — making a field always visible or always
 * required (see `evaluateCondition`). Surfacing it as a warning lets an author catch the typo in
 * the editor instead of discovering the misbehavior on a live case.
 */
export const getMissingConditionFieldMarkers = (
  yamlContent: string,
  // The semantic-validation hook parses the buffer once and shares the Document across both
  // validators to avoid re-parsing per keystroke; callers that pass only the string re-parse here.
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

  const definedNames = getDefinedFieldNames(fieldItems);
  const toPosition = createOffsetToPosition(yamlContent);
  const markers: EditorMarker[] = [];

  const checkCondition = (conditionNode: unknown) => {
    for (const fieldScalar of collectFieldReferenceScalars(conditionNode)) {
      const referencedName = fieldScalar.value;
      if (typeof referencedName === 'string' && !definedNames.has(referencedName)) {
        const position = nodeRangeToMarkerPosition(fieldScalar, toPosition);
        if (position) {
          markers.push({
            ...position,
            message: CONDITION_UNKNOWN_FIELD(referencedName),
            severity: 'warning',
          });
        }
      }
    }
  };

  for (const field of fieldItems) {
    const display = field.get('display', true);
    if (isMap(display)) {
      checkCondition(display.get('show_when', true));
    }

    const validation = field.get('validation', true);
    if (isMap(validation)) {
      checkCondition(validation.get('required_when', true));
    }
  }

  return markers;
};
