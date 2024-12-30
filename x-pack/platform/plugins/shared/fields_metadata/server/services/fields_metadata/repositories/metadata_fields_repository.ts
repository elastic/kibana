/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import mapValues from 'lodash/mapValues';
import { MetadataFieldName } from '../../../../common/fields_metadata';
import { FieldsMetadataDictionary } from '../../../../common/fields_metadata/models/fields_metadata_dictionary';
import { AnyFieldName, FieldMetadata, TMetadataFields } from '../../../../common';

interface MetadataFieldsRepositoryDeps {
  metadataFields: TMetadataFields;
}

interface FindOptions {
  fieldNames?: MetadataFieldName[];
}

export class MetadataFieldsRepository {
  private readonly metadataFields: Record<MetadataFieldName, FieldMetadata>;

  private constructor(metadataFields: TMetadataFields) {
    this.metadataFields = mapValues(metadataFields, (field) =>
      FieldMetadata.create({ ...field, source: 'metadata' })
    );
  }

  getByName(fieldName: MetadataFieldName | AnyFieldName): FieldMetadata | undefined {
    return this.metadataFields[fieldName as MetadataFieldName];
  }

  find({ fieldNames }: FindOptions = {}): FieldsMetadataDictionary {
    if (!fieldNames) {
      return FieldsMetadataDictionary.create(this.metadataFields);
    }

    const fields = fieldNames.reduce((fieldsMetadata, fieldName) => {
      const field = this.getByName(fieldName);

      if (field) {
        fieldsMetadata[fieldName] = field;
      }

      return fieldsMetadata;
    }, {} as Record<MetadataFieldName, FieldMetadata>);

    return FieldsMetadataDictionary.create(fields);
  }

  public static create({ metadataFields }: MetadataFieldsRepositoryDeps) {
    return new MetadataFieldsRepository(metadataFields);
  }
}
