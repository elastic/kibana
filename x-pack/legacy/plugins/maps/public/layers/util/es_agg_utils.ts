/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import _ from 'lodash';
import { IndexPattern, IFieldType } from '../../../../../../../src/plugins/data/public';

export function getField(indexPattern: IndexPattern, fieldName: string) {
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

export function addFieldToDSL(dsl: object, field: IFieldType) {
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

export function extractPropertiesFromBucket(bucket: any, ignoreKeys: string[] = []) {
  const properties: Record<string | number, unknown> = {};
  for (const key in bucket) {
    if (ignoreKeys.includes(key) || !bucket.hasOwnProperty(key)) {
      continue;
    }

    if (_.has(bucket[key], 'value')) {
      properties[key] = bucket[key].value;
    } else if (_.has(bucket[key], 'buckets')) {
      properties[key] = _.get(bucket[key], 'buckets[0].key');
    } else {
      properties[key] = bucket[key];
    }
  }
  return properties;
}
