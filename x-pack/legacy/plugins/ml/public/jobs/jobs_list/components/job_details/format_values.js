/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import numeral from '@elastic/numeral';
import { formatDate } from '@elastic/eui/lib/services/format';
import { toLocaleString } from 'plugins/ml/util/string_utils';

const TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';
const DATA_FORMAT = '0.0 b';

function formatData(txt) {
  return numeral(txt).format(DATA_FORMAT);
}

export function formatValues([key, value]) {
  // time
  switch (key) {
    case 'finished_time':
    case 'create_time':
    case 'log_time':
    case 'timestamp':
    case 'earliest_record_timestamp':
    case 'latest_record_timestamp':
    case 'last_data_time':
    case 'latest_empty_bucket_timestamp':
    case 'latest_sparse_bucket_timestamp':
    case 'latest_bucket_timestamp':
      value = formatDate(value, TIME_FORMAT);
      break;

    // data
    case 'established_model_memory':
    case 'input_bytes':
    case 'model_bytes':
      value = formatData(value);
      break;

    // numbers
    case 'processed_record_count':
    case 'processed_field_count':
    case 'input_field_count':
    case 'invalid_date_count':
    case 'missing_field_count':
    case 'out_of_order_timestamp_count':
    case 'empty_bucket_count':
    case 'sparse_bucket_count':
    case 'bucket_count':
    case 'input_record_count':
    case 'total_by_field_count':
    case 'total_over_field_count':
    case 'total_partition_field_count':
    case 'bucket_allocation_failures_count':
      value = toLocaleString(value);
      break;

    default:
      break;
  }
  return [key, value];
}

// utility function to filter child object and arrays out of the supplied object.
// overrides can be supplied to allow either objects or arrays
// used to remove lists or nested objects from the job config when displaying it in the expanded row
export function filterObjects(obj, allowArrays, allowObjects) {
  return Object.keys(obj)
    .filter(
      k => allowObjects || typeof obj[k] !== 'object' || (allowArrays && Array.isArray(obj[k]))
    )
    .map(k => {
      let item = obj[k];
      if (Array.isArray(item)) {
        item = item.join(', ');
      } else if (typeof obj[k] === 'object') {
        item = JSON.stringify(item);
      }
      return [k, item];
    });
}
