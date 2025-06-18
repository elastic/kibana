/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import { ES_FIELD_TYPES } from '@kbn/field-types';

const fieldPriority = ['message', 'error.message', 'event.original'];

export function getCategorizationField(fields: string[]): string | undefined {
  const fieldSet = new Set(fields);
  for (const field of fieldPriority) {
    if (fieldSet.has(field)) {
      return field;
    }
  }
  return undefined;
}

export function getCategorizationDataViewField(dataView: DataView): {
  messageField: DataViewField | null;
  dataViewFields: DataViewField[];
} {
  const dataViewFields = dataView.fields.filter((f) => f.esTypes?.includes(ES_FIELD_TYPES.TEXT));
  const categorizationFieldName = getCategorizationField(dataViewFields.map((f) => f.name));
  if (categorizationFieldName) {
    return {
      messageField: dataView.fields.getByName(categorizationFieldName) ?? null,
      dataViewFields,
    };
  }

  return {
    messageField: dataViewFields[0] ?? null,
    dataViewFields,
  };
}
