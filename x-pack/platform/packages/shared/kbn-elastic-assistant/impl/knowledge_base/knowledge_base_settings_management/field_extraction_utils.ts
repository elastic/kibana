/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingProperty } from '@elastic/elasticsearch/lib/api/types';

export interface ExtractedField {
  name: string;
  type: string;
  fullPath: string;
}

/**
 * Checks if a mapping property has nested properties
 */
const hasProperties = (
  property: MappingProperty
): property is MappingProperty & {
  properties: Record<string, MappingProperty>;
} => {
  return (
    'properties' in property &&
    typeof property.properties === 'object' &&
    property.properties !== null
  );
};

/**
 * Checks if a mapping property has multi-fields
 */
const hasFields = (
  property: MappingProperty
): property is MappingProperty & {
  fields: Record<string, MappingProperty>;
} => {
  return 'fields' in property && typeof property.fields === 'object' && property.fields !== null;
};

/**
 * Checks if a field type is searchable for text queries
 */
const isSearchableTextType = (type: string): boolean => {
  return type === 'text' || type === 'semantic_text';
};

/**
 * Recursively extracts all searchable fields from Elasticsearch mapping properties
 *
 * @param properties - The mapping properties object
 * @param parentPath - The parent field path (for nested fields)
 * @returns Array of extracted searchable fields
 */
const extractFieldsFromProperties = (
  properties: Record<string, MappingProperty>,
  parentPath: string = ''
): ExtractedField[] => {
  const extractedFields: ExtractedField[] = [];

  for (const [fieldName, fieldMapping] of Object.entries(properties)) {
    const fullPath = parentPath ? `${parentPath}.${fieldName}` : fieldName;

    // Check if the field itself is searchable
    if (fieldMapping.type && isSearchableTextType(fieldMapping.type)) {
      extractedFields.push({
        name: fieldName,
        type: fieldMapping.type,
        fullPath,
      });
    }

    // Check multi-fields (fields property)
    if (hasFields(fieldMapping)) {
      for (const [multiFieldName, multiFieldMapping] of Object.entries(fieldMapping.fields)) {
        if (multiFieldMapping.type && isSearchableTextType(multiFieldMapping.type)) {
          extractedFields.push({
            name: multiFieldName,
            type: multiFieldMapping.type,
            fullPath: `${fullPath}.${multiFieldName}`,
          });
        }
      }
    }

    // Recursively process nested object properties
    if (hasProperties(fieldMapping)) {
      const nestedFields = extractFieldsFromProperties(fieldMapping.properties, fullPath);
      extractedFields.push(...nestedFields);
    }
  }

  return extractedFields;
};

/**
 * Extracts all searchable fields from Elasticsearch mappings
 *
 * @param mappings - The mappings object from Elasticsearch
 * @returns Array of searchable fields with their full paths and types
 */
export const extractSearchableFields = (mappings: {
  mappings?: {
    properties?: Record<string, MappingProperty>;
  };
}): ExtractedField[] => {
  if (!mappings?.mappings?.properties) {
    return [];
  }

  return extractFieldsFromProperties(mappings.mappings.properties);
};

/**
 * Extracts all fields (not just searchable ones) from Elasticsearch mappings
 * Used for output field options where any field type is acceptable
 *
 * @param mappings - The mappings object from Elasticsearch
 * @returns Array of all fields with their full paths and types
 */
export const extractAllFields = (mappings: {
  mappings?: {
    properties?: Record<string, MappingProperty>;
  };
}): ExtractedField[] => {
  if (!mappings?.mappings?.properties) {
    return [];
  }

  return extractAllFieldsFromProperties(mappings.mappings.properties);
};

/**
 * Recursively extracts all fields (regardless of type) from mapping properties
 */
const extractAllFieldsFromProperties = (
  properties: Record<string, MappingProperty>,
  parentPath: string = ''
): ExtractedField[] => {
  const extractedFields: ExtractedField[] = [];

  for (const [fieldName, fieldMapping] of Object.entries(properties)) {
    const fullPath = parentPath ? `${parentPath}.${fieldName}` : fieldName;

    // Add the field if it has a type
    if (fieldMapping.type) {
      extractedFields.push({
        name: fieldName,
        type: fieldMapping.type,
        fullPath,
      });
    }

    // Check multi-fields (fields property)
    if (hasFields(fieldMapping)) {
      for (const [multiFieldName, multiFieldMapping] of Object.entries(fieldMapping.fields)) {
        if (multiFieldMapping.type) {
          extractedFields.push({
            name: multiFieldName,
            type: multiFieldMapping.type,
            fullPath: `${fullPath}.${multiFieldName}`,
          });
        }
      }
    }

    // Recursively process nested object properties
    if (hasProperties(fieldMapping)) {
      const nestedFields = extractAllFieldsFromProperties(fieldMapping.properties, fullPath);
      extractedFields.push(...nestedFields);
    }
  }

  return extractedFields;
};
