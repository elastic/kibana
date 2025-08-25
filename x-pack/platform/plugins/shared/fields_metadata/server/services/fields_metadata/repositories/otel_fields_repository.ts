/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PathReporter } from 'io-ts/PathReporter';
import { mapValues } from 'lodash';
import { isLeft } from 'fp-ts/Either';
import { fieldsMetadataDictionaryRT } from '../../../../common/fields_metadata';
import { FieldsMetadataDictionary } from '../../../../common/fields_metadata/models/fields_metadata_dictionary';
import type { AnyFieldName, OtelFieldName, FieldMetadataPlain } from '../../../../common';
import { FieldMetadata } from '../../../../common';
import type { TOtelFields } from '../../../../common/fields_metadata/types';

// Helper function to convert structured semconv fields to FieldMetadataPlain format
function convertSemconvToFieldMetadata(
  semconvFields: TOtelFields
): Record<string, FieldMetadataPlain> {
  const result: Record<string, FieldMetadataPlain> = {};

  for (const [fieldName, fieldData] of Object.entries(semconvFields)) {
    result[fieldName] = {
      name: fieldData.name,
      description: fieldData.description,
      type: fieldData.type,
      ...(fieldData.example && { example: fieldData.example }),
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

/**
 * Strip common OpenTelemetry prefixes from field names to match the actual field names
 * in the semantic conventions dictionary.
 * 
 * Examples:
 * - "resource.attributes.cloud.account.id" -> "cloud.account.id"
 * - "attributes.service.name" -> "service.name"
 * - "cloud.account.id" -> "cloud.account.id" (no change)
 */
function stripOtelPrefixes(fieldName: string): string {
  // Strip "resource.attributes." prefix
  if (fieldName.startsWith('resource.attributes.')) {
    return fieldName.substring('resource.attributes.'.length);
  }
  
  // Strip "attributes." prefix
  if (fieldName.startsWith('attributes.')) {
    return fieldName.substring('attributes.'.length);
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
    // Strip OTel prefixes before looking up the field
    const strippedFieldName = stripOtelPrefixes(fieldName as string);
    return this.otelFields[strippedFieldName as OtelFieldName];
  }

  find({ fieldNames }: FindOptions = {}): FieldsMetadataDictionary {
    if (!fieldNames) {
      return FieldsMetadataDictionary.create(this.otelFields);
    }

    const fields = fieldNames.reduce((fieldsMetadata, fieldName) => {
      // Strip OTel prefixes before looking up the field
      const strippedFieldName = stripOtelPrefixes(fieldName as string);
      const field = this.otelFields[strippedFieldName as OtelFieldName];

      if (field) {
        // Use the stripped field name as the key in the result
        fieldsMetadata[strippedFieldName as OtelFieldName] = field;
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
