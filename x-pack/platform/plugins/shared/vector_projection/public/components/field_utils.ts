/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView } from '@kbn/data-views-plugin/public';
import type { VectorFieldKind } from '../embeddable/vector_sample';

const LABEL_FIELD_TYPES: readonly string[] = ['string', 'boolean', 'number', 'ip'];

export const getVectorFieldNames = (dataView: DataView): string[] =>
  dataView.fields
    .filter(({ esTypes }) => esTypes?.includes('dense_vector'))
    .map(({ name }) => name)
    .sort();

/** Data views report semantic_text as `text`, so any vector field that isn't dense_vector is one. */
export const getVectorFieldKind = (dataView: DataView, fieldName: string): VectorFieldKind =>
  dataView.getFieldByName(fieldName)?.esTypes?.includes('dense_vector')
    ? 'dense_vector'
    : 'semantic_text';

/** Fields that make useful categorical colors: aggregatable scalars, excluding metadata. */
export const getLabelFieldNames = (dataView: DataView): string[] =>
  dataView.fields
    .filter(
      ({ aggregatable, type, name }) =>
        aggregatable && LABEL_FIELD_TYPES.includes(type) && !name.startsWith('_')
    )
    .map(({ name }) => name)
    .sort();
