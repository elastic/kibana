/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';

export function mapRequests(requests) {
  return _.reduce(
    _.values(requests),
    (result, value) => {
      result.total += value.total;
      result.disconnects += value.disconnects;
      return result;
    },
    { total: 0, disconnects: 0 }
  );
}
