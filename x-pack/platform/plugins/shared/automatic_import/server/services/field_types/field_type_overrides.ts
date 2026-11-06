/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldTypeChange, FieldTypeError } from '../../../common';
import {
  MAX_FIELD_TYPE_OVERRIDES,
  getFieldTypeCompatibility,
  getFieldValue,
  isSupportedFieldType,
} from '../../../common';
import { InvalidFieldTypeChangeError } from '../../errors';
import type { FieldTypeOverride } from '../saved_objects/schemas/types';
import type { FieldMappingEntry } from '../saved_objects/saved_objects_service';

type SampleDocument = Record<string, unknown> | undefined;

const getDocumentValues = (documents: SampleDocument[], name: string): unknown[] =>
  documents.map((document) => (document ? getFieldValue(document, name) : undefined));

/** Returns only high-confidence failures; warnings remain advisory in the UI. */
export const collectRuleErrors = (
  overrides: FieldTypeOverride[],
  baseDocuments: SampleDocument[]
): FieldTypeError[] =>
  overrides.flatMap(({ name, type }) => {
    const { status, issue, failingDocuments, totalDocuments } = getFieldTypeCompatibility(
      type,
      getDocumentValues(baseDocuments, name)
    );
    if (status !== 'certain_failure') return [];
    return [
      {
        name,
        issue,
        failing_documents: failingDocuments,
        total_documents: totalDocuments,
      },
    ];
  });

/**
 * Merges requested changes into the stored field type edits. A change back to the original type
 * removes the edit. ECS, group, and unknown fields can't be edited. An unsupported type is allowed
 * only when it equals the stored original type (a revert).
 */
export const mergeFieldTypeChanges = (
  fieldMapping: FieldMappingEntry[],
  existingOverrides: FieldTypeOverride[],
  changes: FieldTypeChange[]
): { overrides: FieldTypeOverride[]; reverted: Array<{ name: string; originalType: string }> } => {
  const mappingByName = new Map(fieldMapping.map((mapping) => [mapping.name, mapping]));
  const overridesByName = new Map(existingOverrides.map((override) => [override.name, override]));
  const reverted: Array<{ name: string; originalType: string }> = [];
  const changedNames = new Set<string>();

  for (const { name, type } of changes) {
    if (changedNames.has(name)) {
      throw new InvalidFieldTypeChangeError(`Field ${name} was changed more than once`);
    }
    changedNames.add(name);

    const mapping = mappingByName.get(name);
    if (!mapping) {
      throw new InvalidFieldTypeChangeError(`Field ${name} is not in the field mappings`);
    }
    if (mapping.is_ecs) {
      throw new InvalidFieldTypeChangeError(`Field ${name} is an ECS field and can't be edited`);
    }
    if (mapping.type === 'group') {
      throw new InvalidFieldTypeChangeError(`Field ${name} is an object and can't be edited`);
    }

    const originalType = overridesByName.get(name)?.original_type ?? mapping.type;
    if (type === originalType) {
      overridesByName.delete(name);
      reverted.push({ name, originalType });
    } else if (!isSupportedFieldType(type)) {
      throw new InvalidFieldTypeChangeError(`Type ${type} is not a supported field type`);
    } else {
      overridesByName.set(name, { name, type, original_type: originalType });
    }
  }

  if (overridesByName.size > MAX_FIELD_TYPE_OVERRIDES) {
    throw new InvalidFieldTypeChangeError(
      `At most ${MAX_FIELD_TYPE_OVERRIDES} fields can have an edited type`
    );
  }
  return { overrides: [...overridesByName.values()], reverted };
};

/**
 * Re-bases stored field type edits on the mappings inferred from the pipeline without its generated
 * processors. The original type is refreshed, edits that now match the inferred type are removed,
 * and edits for fields the pipeline no longer produces (or that became ECS fields) are dropped.
 */
export const refreshFieldTypeOverrides = (
  fieldMapping: FieldMappingEntry[],
  overrides: FieldTypeOverride[]
): { overrides: FieldTypeOverride[]; dropped: string[] } => {
  const mappingByName = new Map(fieldMapping.map((mapping) => [mapping.name, mapping]));
  const dropped: string[] = [];
  const refreshed = overrides.flatMap((override) => {
    const mapping = mappingByName.get(override.name);
    if (!mapping || mapping.is_ecs || mapping.type === 'group') {
      dropped.push(override.name);
      return [];
    }
    if (mapping.type === override.type) return [];
    return [{ ...override, original_type: mapping.type }];
  });
  return { overrides: refreshed, dropped };
};

/**
 * Applies field type edits to regenerated field mappings. Edits for fields that are now ECS fields
 * are dropped. Reverted fields keep their original type even when documents infer something else.
 */
export const applyFieldTypeOverrides = (
  fieldMapping: FieldMappingEntry[],
  overrides: FieldTypeOverride[] | undefined,
  reverted: Array<{ name: string; originalType: string }> = []
): { fieldMapping: FieldMappingEntry[]; overrides: FieldTypeOverride[] } => {
  const editableFields = new Map(
    fieldMapping.filter(({ is_ecs: isEcs }) => !isEcs).map((mapping) => [mapping.name, mapping])
  );
  const keptOverrides = (overrides ?? []).filter(({ name }) => editableFields.has(name));
  const typeByName = new Map(keptOverrides.map(({ name, type }) => [name, type]));
  const revertedByName = new Map(
    reverted
      .filter(({ name }) => editableFields.has(name))
      .map(({ name, originalType }) => [name, originalType])
  );

  return {
    fieldMapping: fieldMapping.map((mapping) => {
      if (mapping.is_ecs) return mapping;
      const overrideType = typeByName.get(mapping.name);
      if (overrideType) return { ...mapping, type: overrideType };
      const revertedType = revertedByName.get(mapping.name);
      return revertedType ? { ...mapping, type: revertedType } : mapping;
    }),
    overrides: keptOverrides,
  };
};
