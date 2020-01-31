/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { once } from 'lodash';

const _callWithInternalUser = once(server => {
  const { callWithInternalUser } = server.plugins.elasticsearch.getCluster('admin');
  return callWithInternalUser;
});

export const callWithInternalUserFactory = server => {
  return (...args) => {
    return _callWithInternalUser(server)(...args);
  };
};
