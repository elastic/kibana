/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldDefinition, WiredStreamDefinition } from '@kbn/streams-schema';
import { keepFields } from '@kbn/streams-schema/src/helpers/namespaced_ecs';
import { MalformedFieldsError } from '../errors/malformed_fields_error';
import { baseMappings, namespacePrefixes } from '../component_templates/logs_layer';

export function validateAncestorFields({
  ancestors,
  fields,
}: {
  ancestors: WiredStreamDefinition[];
  fields: FieldDefinition;
}) {
  for (const ancestor of ancestors) {
    for (const fieldName in fields) {
      if (!Object.hasOwn(fields, fieldName)) {
        continue;
      }
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
      if (
        !namespacePrefixes.some((prefix) => fieldName.startsWith(prefix)) &&
        !keepFields.includes(fieldName)
      ) {
        throw new MalformedFieldsError(
          `Field ${fieldName} is not allowed to be defined as it doesn't match the namespaced ECS or OTel schema.`
        );
      }
      for (const prefix of namespacePrefixes) {
        const prefixedName = `${prefix}${fieldName}`;
        if (
          Object.prototype.hasOwnProperty.call(fields, prefixedName) ||
          Object.prototype.hasOwnProperty.call(ancestor.ingest.wired.fields, prefixedName)
        ) {
          throw new MalformedFieldsError(
            `Field ${fieldName} is an automatic alias of ${prefixedName} because of otel compat mode`
          );
        }
      }
      // check the otelMappings - they are aliases and are not allowed to have the same name as a field
      if (Object.keys(baseMappings).some((otelFieldName) => otelFieldName === fieldName)) {
        throw new MalformedFieldsError(
          `Field ${fieldName} is an automatic alias of another field because of otel compat mode`
        );
      }
    }
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
