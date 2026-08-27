/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Document, Scalar, YAMLMap } from 'yaml';
import { isMap, isScalar } from 'yaml';
import { FieldType } from '../../../../common/types/domain/template/fields';
import type { EditorMarker } from './template_yaml_ast';
import {
  createOffsetToPosition,
  getEffectiveFieldName,
  getFieldItemMaps,
  nodeRangeToMarkerPosition,
  parseTemplateDocument,
} from './template_yaml_ast';
import { REQUIRED_FIELD_NO_DEFAULT } from '../translations';

/**
 * Flags inline fields that declare `validation.required: true` but carry no `metadata.default`.
 * Automated case creation (the cases connector) can only fill fields whose defaults it can
 * resolve, so such a field is guaranteed to be empty on every automatically created case — a
 * documented gotcha that otherwise surfaces only as an empty field on a live case. Warning
 * severity: the configuration is legal (humans creating cases in the UI are still prompted),
 * it just deserves a deliberate choice.
 *
 * `$ref` entries are skipped: whether the referenced library field has a default is not visible
 * in the template YAML, and the field library editor shows the equivalent warning at the source
 * when such a definition is authored. Display-only controls (MARKDOWN) hold no value, and
 * conditional requirement (`required_when`, `required_on_close`) is excluded — those are
 * fulfilled by humans at edit/close time, not by the connector at create time.
 */
export const getRequiredNoDefaultMarkers = (
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

  for (const field of fieldItems) {
    const keyNode = getUnfulfillableRequiredKeyNode(field);
    const position = keyNode ? nodeRangeToMarkerPosition(keyNode, toPosition) : null;
    if (position) {
      markers.push({
        ...position,
        message: REQUIRED_FIELD_NO_DEFAULT(getEffectiveFieldName(field) ?? ''),
        severity: 'warning',
      });
    }
  }

  return markers;
};

/**
 * The `required` key node of a field that declares `required: true` with no usable
 * `metadata.default`, or `null` when the field is fine (or out of scope for this check).
 */
const getUnfulfillableRequiredKeyNode = (field: YAMLMap): Scalar | null => {
  if (field.has('$ref') || field.get('control') === FieldType.MARKDOWN) {
    return null;
  }

  const validation = field.get('validation', true);
  if (!isMap(validation)) {
    return null;
  }

  const requiredPair = validation.items.find(
    (pair) => isScalar(pair.key) && pair.key.value === 'required'
  );
  if (!requiredPair || !isScalar(requiredPair.value) || requiredPair.value.value !== true) {
    return null;
  }

  const defaultValue = field.getIn(['metadata', 'default']);
  const hasDefault = defaultValue !== undefined && defaultValue !== null && defaultValue !== '';
  if (hasDefault || !isScalar(requiredPair.key)) {
    return null;
  }

  return requiredPair.key;
};
