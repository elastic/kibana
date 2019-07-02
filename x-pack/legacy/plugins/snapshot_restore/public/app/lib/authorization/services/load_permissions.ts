/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// "useRequest" should also be inside its own shared lib folder ("http" probably)
import { useRequest } from '../../../services/http/use_request';

export const useLoadPermissions = (permissionEndpoint: string) => {
  return useRequest({
    path: permissionEndpoint,
    method: 'get',
  });
};
