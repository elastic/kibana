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
import type { AnyFieldName, EcsFieldName, FieldMetadataPlain } from '../../../../common';
import { FieldMetadata, extractPrefixParts } from '../../../../common';
import type { TEcsFields } from '../../../../common/fields_metadata/types';

export interface EcsFieldsRepositoryDeps {
  ecsFields: TEcsFields;
}

interface FindOptions {
  fieldNames?: EcsFieldName[];
}

export class EcsFieldsRepository {
  private readonly ecsFields: Record<EcsFieldName, FieldMetadata>;

  private constructor(ecsFields: Record<EcsFieldName, FieldMetadataPlain>) {
    this.ecsFields = mapValues(ecsFields, (field) =>
      FieldMetadata.create({ ...field, source: 'ecs' })
    );
  }

  getByName(fieldName: EcsFieldName | AnyFieldName): FieldMetadata | undefined {
    // Try direct lookup first
    const field = this.ecsFields[fieldName as EcsFieldName];
    if (field) {
      return field;
    }

    // Handle prefixed variants using shared utility
    const { prefix, fieldNameWithoutPrefix } = extractPrefixParts(fieldName);
    if (prefix) {
      const baseField = this.ecsFields[fieldNameWithoutPrefix as EcsFieldName];
      if (baseField) {
        return FieldMetadata.create({
          ...baseField.toPlain(),
          name: fieldName,
          flat_name: fieldName,
        });
      }
    }

    return undefined;
  }

  find({ fieldNames }: FindOptions = {}): FieldsMetadataDictionary {
    if (!fieldNames) {
      // Proxy is applied automatically by FieldsMetadataDictionary.create()
      return FieldsMetadataDictionary.create(this.ecsFields);
    }

    const fields = fieldNames.reduce((fieldsMetadata, fieldName) => {
      const field = this.getByName(fieldName);

      if (field) {
        fieldsMetadata[fieldName] = field;
      }

      return fieldsMetadata;
    }, {} as Record<EcsFieldName, FieldMetadata>);

    // Proxy is applied automatically by FieldsMetadataDictionary.create()
    return FieldsMetadataDictionary.create(fields);
  }

  public static create({ ecsFields }: EcsFieldsRepositoryDeps) {
    const decodedFields = fieldsMetadataDictionaryRT.decode(ecsFields);
    if (isLeft(decodedFields)) {
      throw Error(
        `EcsFieldsRepositoryDeps.create: could not validate data: ${PathReporter.report(
          decodedFields
        ).join('\n')}`
      );
    }

    return new EcsFieldsRepository(decodedFields.right as Record<EcsFieldName, FieldMetadataPlain>);
  }
}
