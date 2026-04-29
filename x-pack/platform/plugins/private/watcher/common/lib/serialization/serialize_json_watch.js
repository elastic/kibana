/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WATCH_TYPES } from '../../constants';

export function serializeJsonWatch(name, json) {
  // We don't want to overwrite any metadata provided by the consumer.
  const { metadata = {} } = json;

  const serializedWatch = {
    ...json,
    metadata: {
      ...metadata,
      xpack: {
        ...metadata.xpack,
        type: WATCH_TYPES.JSON,
      },
    },
  };

  if (name) {
    serializedWatch.metadata.name = name;
  }

  return serializedWatch;
}
