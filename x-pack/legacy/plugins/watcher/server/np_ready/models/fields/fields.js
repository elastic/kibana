/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { badRequest } from 'boom';
import { forEach, keys, sortBy } from 'lodash';
import { normalizedFieldTypes } from '../../lib/normalized_field_types';
import { i18n } from '@kbn/i18n';

function buildFieldList(fields) {
  const result = [];

  forEach(fields, (field, name) => {
    // If the field exists in multiple indexes, the types may be inconsistent.
    // In this case, default to the first type.
    const type = keys(field)[0];

    // Do not include fields that have a type that starts with an underscore.
    if (type[0] === '_') {
      return;
    }

    const normalizedType = normalizedFieldTypes[type] || type;
    const aggregatable = field[type].aggregatable;
    const searchable = field[type].searchable;

    result.push({
      name,
      type,
      normalizedType,
      aggregatable,
      searchable
    });
  });

  return sortBy(result, 'name');
}

export class Fields {
  constructor(props) {
    this.fields = props.fields;
  }

  get downstreamJson() {
    const result = {
      fields: this.fields
    };

    return result;
  }

  static fromUpstreamJson(json) {
    if (!json.fields) {
      throw badRequest(
        i18n.translate('xpack.watcher.models.fields.fieldsPropertyMissingBadRequestMessage', {
          defaultMessage: 'JSON argument must contain a {fields} property',
          values: {
            fields: 'fields'
          }
        }),
      );
    }

    const fields = buildFieldList(json.fields);
    return new Fields({ fields });
  }
}
