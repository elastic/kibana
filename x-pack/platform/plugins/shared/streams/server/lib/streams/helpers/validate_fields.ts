/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldDefinition, WiredStreamDefinition, isRoot } from '@kbn/streams-schema';
import { MalformedFieldsError } from '../errors/malformed_fields_error';

export function validateAncestorFields({
  ancestors,
  fields,
}: {
  ancestors: WiredStreamDefinition[];
  fields: FieldDefinition;
}) {
  for (const ancestor of ancestors) {
    for (const fieldName in fields) {
      if (
        Object.hasOwn(fields, fieldName) &&
        Object.entries(ancestor.ingest.wired.fields).some(
          ([ancestorFieldName, attr]) =>
            attr.type !== fields[fieldName].type && ancestorFieldName === fieldName
        )
      ) {
        throw new MalformedFieldsError(
          `Field ${fieldName} is already defined with incompatible type in the parent stream ${ancestor.name}`
        );
      }
    }
  }
}

export function validateSystemFields(definition: WiredStreamDefinition) {
  if (isRoot(definition.name)) {
    // the root stream is allowed to have system fields
    return;
  }
  // child streams are not supposed to have system fields
  if (Object.values(definition.ingest.wired.fields).some((field) => field.type === 'system')) {
    throw new MalformedFieldsError(
      `Stream ${definition.name} is not allowed to have system fields`
    );
  }
}

export function validateDescendantFields({
  descendants,
  fields,
}: {
  descendants: WiredStreamDefinition[];
  fields: FieldDefinition;
}) {
  for (const descendant of descendants) {
    for (const fieldName in fields) {
      if (
        Object.hasOwn(fields, fieldName) &&
        Object.entries(descendant.ingest.wired.fields).some(
          ([descendantFieldName, attr]) =>
            attr.type !== fields[fieldName].type && descendantFieldName === fieldName
        )
      ) {
        throw new MalformedFieldsError(
          `Field ${fieldName} is already defined with incompatible type in the child stream ${descendant.name}`
        );
      }
    }
  }
}
