/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';

/**
 *  Create a map of FieldFormat instances for index pattern fields
 *
 *  @param {Object} indexPatternSavedObject
 *  @param {FieldFormatsService} fieldFormats
 *  @return {Map} key: field name, value: FieldFormat instance
 */
export function fieldFormatMapFactory(indexPatternSavedObject, fieldFormats) {
  const formatsMap = new Map();

  //Add FieldFormat instances for fields with custom formatters
  if (_.has(indexPatternSavedObject, 'attributes.fieldFormatMap')) {
    const fieldFormatMap = JSON.parse(indexPatternSavedObject.attributes.fieldFormatMap);
    Object.keys(fieldFormatMap).forEach(fieldName => {
      const formatConfig = fieldFormatMap[fieldName];

      if (!_.isEmpty(formatConfig)) {
        formatsMap.set(fieldName, fieldFormats.getInstance(formatConfig));
      }
    });
  }

  //Add default FieldFormat instances for all other fields
  const indexFields = JSON.parse(_.get(indexPatternSavedObject, 'attributes.fields', '[]'));
  indexFields.forEach(field => {
    if (!formatsMap.has(field.name)) {
      formatsMap.set(field.name, fieldFormats.getDefaultInstance(field.type));
    }
  });

  return formatsMap;
}
