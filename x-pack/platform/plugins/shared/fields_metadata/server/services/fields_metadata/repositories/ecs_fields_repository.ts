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
import { FieldMetadata } from '../../../../common';
import type { TEcsFields } from '../../../../common/fields_metadata/types';

export interface EcsFieldsRepositoryDeps {
  ecsFields: TEcsFields;
}

interface FindOptions {
  fieldNames?: EcsFieldName[];
}

export class EcsFieldsRepository {
  private readonly fieldsDictionary: FieldsMetadataDictionary;

  private constructor(ecsFields: Record<EcsFieldName, FieldMetadataPlain>) {
    const fields = mapValues(ecsFields, (field) =>
      FieldMetadata.create({ ...field, source: 'ecs' })
    );
    // Create dictionary once - it contains proxied fields for prefix support
    this.fieldsDictionary = FieldsMetadataDictionary.create(fields);
  }

  getByName(fieldName: EcsFieldName | AnyFieldName): FieldMetadata | undefined {
    // Access from the dictionary's proxied fields - handles both direct and prefixed lookups
    return this.fieldsDictionary.getFields()[fieldName];
  }

  find({ fieldNames }: FindOptions = {}): FieldsMetadataDictionary {
    if (!fieldNames) {
      // Return the entire dictionary
      return this.fieldsDictionary;
    }

    const fields = fieldNames.reduce((fieldsMetadata, fieldName) => {
      const field = this.getByName(fieldName);

      if (field) {
        fieldsMetadata[fieldName] = field;
      }

      return fieldsMetadata;
    }, {} as Record<EcsFieldName, FieldMetadata>);

    // Create a new dictionary with the filtered fields (also gets proxy)
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
