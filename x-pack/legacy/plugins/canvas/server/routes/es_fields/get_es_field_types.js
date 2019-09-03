/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mapValues, keys } from 'lodash';
import { normalizeType } from '../../lib/normalize_type';

export function getESFieldTypes(index, fields, elasticsearchClient) {
  const config = {
    index: index,
    fields: fields || '*',
  };

  if (fields && fields.length === 0) {
    return Promise.resolve({});
  }

  return elasticsearchClient('fieldCaps', config).then(resp => {
    return mapValues(resp.fields, types => {
      if (keys(types).length > 1) {
        return 'conflict';
      }

      try {
        return normalizeType(keys(types)[0]);
      } catch (e) {
        return 'unsupported';
      }
    });
  });
}
