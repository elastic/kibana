/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Detector } from '@kbn/ml-common-types/anomaly_detection_jobs/job';

// wrap a the inputed string in quotes if it contains non-word characters
function quoteField(field: string): string {
  if (field.match(/\W/g)) {
    return '"' + field + '"';
  } else {
    return field;
  }
}

// creates the default description for a given detector
export function detectorToString(dtr: Detector): string {
  const BY_TOKEN = ' by ';
  const OVER_TOKEN = ' over ';
  const USE_NULL_OPTION = ' use_null=';
  const PARTITION_FIELD_OPTION = ' partition_field_name=';
  const EXCLUDE_FREQUENT_OPTION = ' exclude_frequent=';

  let txt = '';

  if (dtr.function !== undefined && dtr.function !== '') {
    txt += dtr.function;
    if (dtr.field_name !== undefined && dtr.field_name !== '') {
      txt += '(' + quoteField(dtr.field_name) + ')';
    }
  } else if (dtr.field_name !== undefined && dtr.field_name !== '') {
    txt += quoteField(dtr.field_name);
  }

  if (dtr.by_field_name !== undefined && dtr.by_field_name !== '') {
    txt += BY_TOKEN + quoteField(dtr.by_field_name);
  }

  if (dtr.over_field_name !== undefined && dtr.over_field_name !== '') {
    txt += OVER_TOKEN + quoteField(dtr.over_field_name);
  }

  if (dtr.use_null !== undefined) {
    txt += USE_NULL_OPTION + dtr.use_null;
  }

  if (dtr.partition_field_name !== undefined && dtr.partition_field_name !== '') {
    txt += PARTITION_FIELD_OPTION + quoteField(dtr.partition_field_name);
  }

  if (dtr.exclude_frequent !== undefined) {
    txt += EXCLUDE_FREQUENT_OPTION + dtr.exclude_frequent;
  }

  return txt;
}
