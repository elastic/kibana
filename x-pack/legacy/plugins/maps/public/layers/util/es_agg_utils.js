/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';

export function getField(indexPattern, fieldName) {
  const field = indexPattern.fields.getByName(fieldName);
  if (!field) {
    throw new Error(
      i18n.translate('xpack.maps.source.esSearch.fieldNotFoundMsg', {
        defaultMessage: `Unable to find '{fieldName}' in index-pattern '{indexPatternTitle}'.`,
        values: { fieldName, indexPatternTitle: indexPattern.title },
      })
    );
  }
  return field;
}

export function addFieldToDSL(dsl, field) {
  return !field.scripted
    ? { ...dsl, field: field.name }
    : {
        ...dsl,
        script: {
          source: field.script,
          lang: field.lang,
        },
      };
}
