/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseDocument, isMap, isSeq, isScalar } from 'yaml';
import { load as parseYaml } from 'js-yaml';

interface FieldDefinition {
  name: string;
  metadata?: {
    default?: string | number;
  };
}

interface ParsedDefinition {
  fields?: FieldDefinition[];
}

/**
 * Updates or adds `metadata.default` for a specific field in the YAML definition.
 * Uses the `yaml` library's parseDocument to preserve comments and formatting.
 */
export const updateYamlFieldDefault = (
  yaml: string,
  fieldName: string,
  newValue: string | number
): string => {
  if (!yaml || yaml.trim() === '') {
    return yaml;
  }

  try {
    // First validate with js-yaml that the field exists
    const parsed = parseYaml(yaml) as ParsedDefinition;
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.fields)) {
      return yaml;
    }
    const fieldExists = parsed.fields.some((field) => field.name === fieldName);
    if (!fieldExists) {
      return yaml;
    }

    // Use yaml's parseDocument to preserve comments
    const doc = parseDocument(yaml);
    const root = doc.contents;

    if (!isMap(root)) {
      return yaml;
    }

    const fieldsNode = root.get('fields', true);
    if (!isSeq(fieldsNode)) {
      return yaml;
    }

    // Find the field in the sequence
    for (const item of fieldsNode.items) {
      if (isMap(item)) {
        const nameNode = item.get('name', true);
        const name = isScalar(nameNode) ? String(nameNode.value) : null;

        if (name === fieldName) {
          const metadataNode = item.get('metadata', true);

          if (!isMap(metadataNode)) {
            // Create metadata if it doesn't exist
            item.set('metadata', { default: newValue });
          } else {
            // Update or add default in existing metadata
            metadataNode.set('default', newValue);
          }
          break;
        }
      }
    }

    return doc.toString();
  } catch {
    return yaml;
  }
};

/**
 * Checks if a field has metadata.default defined in the YAML.
 *
 * @param yaml - The current YAML string
 * @param fieldName - The name of the field to check
 * @returns true if the field has metadata.default, false otherwise
 */
export const hasFieldDefault = (yaml: string, fieldName: string): boolean => {
  if (!yaml || yaml.trim() === '') {
    return false;
  }

  try {
    const parsed = parseYaml(yaml) as ParsedDefinition;

    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.fields)) {
      return false;
    }

    const field = parsed.fields.find((f) => f.name === fieldName);

    if (!field) {
      return false;
    }

    return field.metadata?.default !== undefined;
  } catch {
    return false;
  }
};
