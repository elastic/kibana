/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { difference } from 'lodash';

export function getFieldNames(results) {
  const { mappings, field_stats: fieldStats, column_names: columnNames } = results;

  // if columnNames exists (i.e delimited) use it for the field list
  // so we get the same order
  const tempFields = columnNames !== undefined ? columnNames : Object.keys(fieldStats);

  // there may be fields in the mappings which do not exist in the field_stats
  // e.g. the message field for a semi-structured log file, as they have no stats.
  // add any extra fields to the list
  const differenceFields = difference(Object.keys(mappings), tempFields);

  // except @timestamp
  const timestampIndex = differenceFields.indexOf('@timestamp');
  if (timestampIndex !== -1) {
    differenceFields.splice(timestampIndex, 1);
  }

  if (differenceFields.length) {
    tempFields.push(...differenceFields);
  }
  return tempFields;
}
