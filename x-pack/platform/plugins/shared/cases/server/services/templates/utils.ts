/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseDocument, isMap, isSeq, isScalar } from 'yaml';
import type { ParsedTemplate } from '../../../common/types/domain/template/v1';
import { isInlineField } from '../../../common/types/domain/template/fields';

type ParsedField = ParsedTemplate['definition']['fields'][number];

export const toFieldDefinitions = (fields: ParsedField[]) =>
  fields.filter(isInlineField).map((f) => ({
    name: f.name,
    label: f.label ?? f.name,
    type: f.type,
    control: f.control,
  }));

/**
 * Trims leading/trailing whitespace from string-typed `metadata.default` values
 * in the YAML definition. Preserves comments and formatting of the rest of the document.
 */
export const trimFieldDefaults = (definition: string): string => {
  if (!definition || definition.trim() === '') {
    return definition;
  }

  try {
    const doc = parseDocument(definition);
    const root = doc.contents;

    if (!isMap(root)) return definition;

    const fieldsNode = root.get('fields', true);
    if (!isSeq(fieldsNode)) return definition;

    let modified = false;

    for (const item of fieldsNode.items) {
      if (isMap(item)) {
        const metadataNode = item.get('metadata', true);

        if (isMap(metadataNode)) {
          const defaultNode = metadataNode.get('default', true);

          if (isScalar(defaultNode) && typeof defaultNode.value === 'string') {
            const trimmed = defaultNode.value.trim();
            if (trimmed !== defaultNode.value) {
              defaultNode.value = trimmed;
              modified = true;
            }
          }
        }
      }
    }

    return modified ? doc.toString() : definition;
  } catch {
    return definition;
  }
};
