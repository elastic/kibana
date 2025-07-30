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
import { AnyFieldName, EcsFieldName, FieldMetadata, FieldMetadataPlain } from '../../../../common';
import { TEcsFields } from '../../../../common/fields_metadata/types';

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
    return this.ecsFields[fieldName as EcsFieldName];
  }

  find({ fieldNames }: FindOptions = {}): FieldsMetadataDictionary {
    if (!fieldNames) {
      return FieldsMetadataDictionary.create(this.ecsFields);
    }

    const fields = fieldNames.reduce((fieldsMetadata, fieldName) => {
      const field = this.getByName(fieldName);

      if (field) {
        fieldsMetadata[fieldName] = field;
      }

      return fieldsMetadata;
    }, {} as Record<EcsFieldName, FieldMetadata>);

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
