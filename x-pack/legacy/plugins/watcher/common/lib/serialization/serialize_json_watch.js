/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { WATCH_TYPES } from '../../constants';

export function serializeJsonWatch(name, json) {
  const serializedWatch = {
    ...json,
    metadata: {
      xpack: {
        type: WATCH_TYPES.JSON,
      }
    },
  };

  if (name) {
    serializedWatch.metadata.name = name;
  }

  return serializedWatch;
}
