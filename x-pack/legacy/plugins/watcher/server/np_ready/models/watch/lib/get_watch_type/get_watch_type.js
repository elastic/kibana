/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, contains, values } from 'lodash';
import { WATCH_TYPES } from '../../../../../../common/constants';

export function getWatchType(watchJson) {
  const type = get(watchJson, 'metadata.xpack.type');
  if (contains(values(WATCH_TYPES), type)) {
    return type;
  }

  return WATCH_TYPES.JSON;
}
