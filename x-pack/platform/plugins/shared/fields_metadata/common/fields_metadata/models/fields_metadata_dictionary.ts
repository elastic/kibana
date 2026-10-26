/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapValues } from 'lodash';
import type { FieldAttribute, FieldMetadataPlain, PartialFieldMetadataPlain } from '../types';
import type { FieldMetadata } from './field_metadata';
import { createProxiedFieldsMap } from '../utils/create_proxied_fields_map';

export type FieldsMetadataMap = Record<string, FieldMetadata>;

export class FieldsMetadataDictionary {
  private constructor(private readonly fields: FieldsMetadataMap) {}

  getFields() {
    return this.fields;
  }

  pick(attributes: FieldAttribute[]): Record<string, PartialFieldMetadataPlain> {
    return mapValues(this.fields, (field) => field.pick(attributes));
  }

  toPlain(): Record<string, FieldMetadataPlain> {
    return mapValues(this.fields, (field) => field.toPlain());
  }

  public static create(fields: FieldsMetadataMap) {
    // Wrap fields in a proxy to handle prefixed field lookups dynamically
    const proxiedFields = createProxiedFieldsMap(fields);
    return new FieldsMetadataDictionary(proxiedFields);
  }
}
