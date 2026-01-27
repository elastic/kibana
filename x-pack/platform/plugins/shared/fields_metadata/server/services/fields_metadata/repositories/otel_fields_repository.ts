/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PathReporter } from 'io-ts/PathReporter';
import { mapValues } from 'lodash';
import { isLeft } from 'fp-ts/Either';
import { FieldMetadata } from '../../../../common/fields_metadata/models/field_metadata';
import { fieldsMetadataDictionaryRT } from '../../../../common/fields_metadata';
import { FieldsMetadataDictionary } from '../../../../common/fields_metadata/models/fields_metadata_dictionary';
import type { AnyFieldName, OtelFieldName, FieldMetadataPlain } from '../../../../common';
import type { TOtelFields } from '../../../../common/fields_metadata/types';

// Helper function to convert structured semconv fields to FieldMetadataPlain format
function convertSemconvToFieldMetadata(
  semconvFields: TOtelFields
): Record<string, FieldMetadataPlain> {
  const result: Record<string, FieldMetadataPlain> = {};

  for (const [fieldName, fieldData] of Object.entries(semconvFields)) {
    // Ensure fieldData is an object before proceeding
    if (typeof fieldData !== 'object' || fieldData === null) {
      throw new Error(
        `Invalid field data for ${fieldName}: expected object, got ${typeof fieldData}`
      );
    }

    result[fieldName] = {
      name: fieldData.name,
      description: fieldData.description,
      type: fieldData.type,
      ...('example' in fieldData && { example: fieldData.example }),
    };
  }

  return result;
}

export interface OtelFieldsRepositoryDeps {
  otelFields: TOtelFields;
}

interface FindOptions {
  fieldNames?: OtelFieldName[];
}

const OTEL_PREFIXES_TO_STRIP = ['resource.attributes.', 'scope.attributes.', 'attributes.'];

/**
 * Strip common OpenTelemetry prefixes from field names to match the actual field names
 * in the semantic conventions dictionary.
 *
 * Examples:
 * - "resource.attributes.cloud.account.id" -> "cloud.account.id"
 * - "scope.attributes.service.name" -> "service.name"
 * - "attributes.service.name" -> "service.name"
 * - "cloud.account.id" -> "cloud.account.id" (no change)
 */
function stripOtelPrefixes(fieldName: string): string {
  for (const prefix of OTEL_PREFIXES_TO_STRIP) {
    if (fieldName.startsWith(prefix)) {
      return fieldName.substring(prefix.length);
    }
  }

  // Return original field name if no prefixes match
  return fieldName;
}

export class OtelFieldsRepository {
  private readonly otelFields: Record<OtelFieldName, FieldMetadata>;

  private constructor(otelFields: Record<OtelFieldName, FieldMetadataPlain>) {
    this.otelFields = mapValues(otelFields, (field) =>
      FieldMetadata.create({ ...field, source: 'otel' })
    );
  }

  getByName(fieldName: OtelFieldName | AnyFieldName): FieldMetadata | undefined {
    // First, try to find the field directly (handles native prefixed fields)
    const directMatch = this.otelFields[fieldName as OtelFieldName];
    if (directMatch) {
      return directMatch;
    }

    // If not found, strip OTel prefixes and try again (handles base fields with prefix lookups)
    const strippedFieldName = stripOtelPrefixes(fieldName as string);
    return this.otelFields[strippedFieldName as OtelFieldName];
  }

  find({ fieldNames }: FindOptions = {}): FieldsMetadataDictionary {
    if (!fieldNames) {
      return FieldsMetadataDictionary.create(this.otelFields);
    }

    const fields = fieldNames.reduce((fieldsMetadata, fieldName) => {
      const field = this.getByName(fieldName);

      if (field) {
        fieldsMetadata[fieldName] = field;
      }

      return fieldsMetadata;
    }, {} as Record<OtelFieldName, FieldMetadata>);

    return FieldsMetadataDictionary.create(fields);
  }

  public static create({ otelFields }: OtelFieldsRepositoryDeps) {
    // Convert structured semconv fields to FieldMetadataPlain format
    const convertedFields = convertSemconvToFieldMetadata(otelFields);

    const decodedFields = fieldsMetadataDictionaryRT.decode(convertedFields);
    if (isLeft(decodedFields)) {
      throw Error(
        `OtelFieldsRepositoryDeps.create: could not validate data: ${PathReporter.report(
          decodedFields
        ).join('\n')}`
      );
    }

    return new OtelFieldsRepository(
      decodedFields.right as Record<OtelFieldName, FieldMetadataPlain>
    );
  }
}
