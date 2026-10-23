/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldTypeChange, FieldTypeError } from '../../../common';
import { getFieldTypeCompatibility, getFieldValue } from '../../../common';
import type { ApprovedFieldType } from '../saved_objects/schemas/types';
import type { FieldMappingEntry } from '../saved_objects/saved_objects_service';

type SampleDocument = Record<string, unknown> | undefined;

/** Returns the fields that an approval ships, leaving out objects. */
export const toApprovedFieldTypes = (fieldMapping: FieldMappingEntry[]): ApprovedFieldType[] =>
  fieldMapping.filter(({ type }) => type !== 'group').map(({ name, type }) => ({ name, type }));

/**
 * Adds the current field types to the approved ones. Fields the pipeline no longer produces are
 * kept, so they are pinned to their approved type if they come back.
 */
export const mergeApprovedFieldTypes = (
  approved: ApprovedFieldType[],
  fieldMapping: FieldMappingEntry[]
): ApprovedFieldType[] => {
  const typeByName = new Map(approved.map(({ name, type }) => [name, type]));
  for (const { name, type } of toApprovedFieldTypes(fieldMapping)) {
    typeByName.set(name, type);
  }
  return [...typeByName].map(([name, type]) => ({ name, type }));
};

/** Reports explicit changes that would give an approved field a different type. */
export const collectApprovedChangeErrors = (
  changes: FieldTypeChange[],
  approvedTypes: ReadonlyMap<string, string>
): FieldTypeError[] =>
  changes.flatMap(({ name, type }) => {
    const approvedType = approvedTypes.get(name);
    if (approvedType === undefined || approvedType === type) return [];
    return [{ name, issue: 'approved_field_locked', approved_type: approvedType }];
  });

const getAncestors = (name: string): string[] => {
  const segments = name.split('.');
  return segments.slice(1).map((_segment, index) => segments.slice(0, index + 1).join('.'));
};

/** Returns the approved fields that became objects, or whose parent object became a value. */
const findStructureConflicts = (
  fieldMapping: FieldMappingEntry[],
  approvedTypes: ReadonlyMap<string, string>
): string[] => {
  const names = new Set(fieldMapping.map(({ name }) => name));
  const parents = new Set(fieldMapping.flatMap(({ name }) => getAncestors(name)));
  return [...approvedTypes.keys()].filter(
    (name) =>
      !names.has(name) &&
      (parents.has(name) || getAncestors(name).some((ancestor) => names.has(ancestor)))
  );
};

/**
 * Returns the approved fields that the saved mapping has and the new mapping doesn't, leaving out
 * fields that became objects (those are reported as type changes).
 */
export const findRemovedApprovedFields = (
  savedFieldMapping: FieldMappingEntry[],
  fieldMapping: FieldMappingEntry[],
  approvedTypes: ReadonlyMap<string, string>
): string[] => {
  const names = new Set(fieldMapping.map(({ name }) => name));
  const conflicts = new Set(findStructureConflicts(fieldMapping, approvedTypes));
  return savedFieldMapping
    .map(({ name }) => name)
    .filter((name) => approvedTypes.has(name) && !names.has(name) && !conflicts.has(name));
};

/**
 * Keeps approved fields at their approved type. A field that became an object, or whose values
 * can't be stored as the approved type, is reported.
 */
export const pinApprovedFieldTypes = (
  fieldMapping: FieldMappingEntry[],
  approvedTypes: ReadonlyMap<string, string>,
  documents: SampleDocument[]
): { fieldMapping: FieldMappingEntry[]; errors: FieldTypeError[] } => {
  const errors: FieldTypeError[] = findStructureConflicts(fieldMapping, approvedTypes).map(
    (name) => ({ name, issue: 'approved_field_locked', approved_type: approvedTypes.get(name) })
  );
  const pinned = fieldMapping.map((mapping) => {
    const { name, type, is_ecs: isEcs } = mapping;
    const approvedType = approvedTypes.get(name);
    if (approvedType === undefined || isEcs || type === approvedType) return mapping;

    if (type === 'group') {
      errors.push({ name, issue: 'approved_field_locked', approved_type: approvedType });
      return mapping;
    }

    const { status, issue, failingDocuments, totalDocuments } = getFieldTypeCompatibility(
      approvedType,
      documents.map((document) => (document ? getFieldValue(document, name) : undefined))
    );
    if (status === 'certain_failure') {
      errors.push({
        name,
        issue,
        failing_documents: failingDocuments,
        total_documents: totalDocuments,
        approved_type: approvedType,
      });
    }
    return { ...mapping, type: approvedType };
  });
  return { fieldMapping: pinned, errors };
};
