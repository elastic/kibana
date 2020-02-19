/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { once } from 'lodash';
import { getAdminClient } from '../kibana_server_services';

const _callWithInternalUser = once(() => {
  const { callAsInternalUser } = getAdminClient();
  return callAsInternalUser;
});

export const callWithInternalUserFactory = () => {
  return (...args) => {
    return _callWithInternalUser()(...args);
  };
};
