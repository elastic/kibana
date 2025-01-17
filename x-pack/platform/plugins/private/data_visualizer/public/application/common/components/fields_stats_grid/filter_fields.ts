/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SUPPORTED_FIELD_TYPES } from '../../../../../common/constants';

interface CommonFieldConfig {
  type: string;
  fieldName?: string;
  secondaryType?: string;
}

export function matchFieldType<T extends CommonFieldConfig>(fieldType: string, config: T) {
  return fieldType === config.secondaryType || fieldType === config.type;
}
export function filterFields<T extends CommonFieldConfig>(
  fields: T[],
  visibleFieldNames: string[] | undefined,
  visibleFieldTypes: string[] | undefined
) {
  let items = fields;

  if (visibleFieldTypes && visibleFieldTypes.length > 0) {
    items = items.filter(
      (config) => visibleFieldTypes.findIndex((fieldType) => matchFieldType(fieldType, config)) > -1
    );
  }
  if (visibleFieldNames && visibleFieldNames.length > 0) {
    items = items.filter((config) => {
      return visibleFieldNames.findIndex((fieldName) => fieldName === config.fieldName) > -1;
    });
  }

  return {
    filteredFields: items,
    visibleFieldsCount: items.length,
    visibleMetricsCount: items.filter((d) => d.type === SUPPORTED_FIELD_TYPES.NUMBER).length,
  };
}
