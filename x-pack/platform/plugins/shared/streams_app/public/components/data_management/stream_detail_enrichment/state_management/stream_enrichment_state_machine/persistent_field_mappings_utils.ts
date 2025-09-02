/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SchemaField, MappedSchemaField } from '../../../schema_editor/types';
import type { PersistentFieldMapping } from './types';

export interface FieldMatchingResult {
  exactMatches: FieldRestoration[];
  potentialReorderings: ReorderingDetection[];
  unmatchedPersistentMappings: PersistentFieldMapping[];
}

export interface FieldRestoration {
  fieldName: string;
  currentField: SchemaField;
  persistentMapping: PersistentFieldMapping;
  matchType: 'exact' | 'position';
}

export interface ReorderingDetection {
  fieldName: string;
  oldPosition: number;
  newPosition: number;
  persistentMapping: PersistentFieldMapping;
  confidence: 'high' | 'medium' | 'low';
}

export function findExactFieldMatches(
  currentFields: SchemaField[],
  persistentMappings: Map<string, PersistentFieldMapping>
): FieldRestoration[] {
  const exactMatches: FieldRestoration[] = [];

  currentFields.forEach((field) => {
    const persistentMapping = persistentMappings.get(field.name);
    if (persistentMapping) {
      exactMatches.push({
        fieldName: field.name,
        currentField: field,
        persistentMapping,
        matchType: 'exact',
      });
    }
  });

  return exactMatches;
}

export function detectFieldReordering(
  currentFields: SchemaField[],
  persistentMappings: Map<string, PersistentFieldMapping>
): ReorderingDetection[] {
  const reorderings: ReorderingDetection[] = [];

  Array.from(persistentMappings.entries()).forEach(([fieldName, persistentMapping]) => {
    if (persistentMapping.lastSeenPosition !== undefined) {
      const currentPosition = currentFields.findIndex((field) => field.name === fieldName);

      if (currentPosition !== -1 && currentPosition !== persistentMapping.lastSeenPosition) {
        reorderings.push({
          fieldName,
          oldPosition: persistentMapping.lastSeenPosition,
          newPosition: currentPosition,
          persistentMapping,
          confidence:
            Math.abs(currentPosition - persistentMapping.lastSeenPosition) === 1
              ? 'high'
              : 'medium',
        });
      }
    }
  });

  return reorderings;
}

export function getProcessorScopedMappings(
  processorId: string,
  persistentMappings: Map<string, PersistentFieldMapping>
): PersistentFieldMapping[] {
  return Array.from(persistentMappings.values()).filter(
    (mapping) => mapping.processorId === processorId
  );
}

export function findUnmatchedPersistentMappings(
  currentFields: SchemaField[],
  persistentMappings: Map<string, PersistentFieldMapping>
): PersistentFieldMapping[] {
  const currentFieldNames = new Set(currentFields.map((field) => field.name));

  return Array.from(persistentMappings.values()).filter(
    (mapping) => !currentFieldNames.has(mapping.fieldName)
  );
}

export function matchFieldsWithPersistentMappings(
  currentFields: SchemaField[],
  persistentMappings: Map<string, PersistentFieldMapping>
): FieldMatchingResult {
  const exactMatches = findExactFieldMatches(currentFields, persistentMappings);
  const potentialReorderings = detectFieldReordering(currentFields, persistentMappings);
  const unmatchedPersistentMappings = findUnmatchedPersistentMappings(
    currentFields,
    persistentMappings
  );

  return {
    exactMatches,
    potentialReorderings,
    unmatchedPersistentMappings,
  };
}

export function applyFieldRestoration(
  currentFields: SchemaField[],
  restorations: FieldRestoration[]
): SchemaField[] {
  return currentFields.map((field) => {
    const restoration = restorations.find((r) => r.fieldName === field.name);

    if (restoration) {
      const restoredField: MappedSchemaField = {
        ...field,
        status: 'mapped',
        type: restoration.persistentMapping.type,
        additionalParameters: restoration.persistentMapping.additionalParameters,
      };
      return restoredField;
    }

    return field;
  });
}


export function updateFieldPositions(
  fields: SchemaField[],
  persistentMappings: Map<string, PersistentFieldMapping>
): Map<string, PersistentFieldMapping> {
  const updatedMappings = new Map(persistentMappings);

  fields.forEach((field, index) => {
    const mapping = updatedMappings.get(field.name);
    if (mapping) {
      updatedMappings.set(field.name, {
        ...mapping,
        lastSeenPosition: index,
      });
    }
  });

  return updatedMappings;
}
