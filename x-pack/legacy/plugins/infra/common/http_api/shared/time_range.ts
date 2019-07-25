/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as runtimeTypes from 'io-ts';

export const timeRangeRT = runtimeTypes.type({
  startTime: runtimeTypes.number,
  endTime: runtimeTypes.number,
});
