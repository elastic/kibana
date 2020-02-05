/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { once } from 'lodash';

const _callWithInternalUser = once(elasticsearchPlugin => {
  const { callWithInternalUser } = elasticsearchPlugin.getCluster('admin');
  return callWithInternalUser;
});

export const callWithInternalUserFactory = elasticsearchPlugin => {
  return (...args) => {
    return _callWithInternalUser(elasticsearchPlugin)(...args);
  };
};
