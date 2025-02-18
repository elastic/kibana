/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';

import { API_VERSIONS, appRoutesService } from '../../../common';

import { sendRequestForRq } from './use_request';

export function useAgentPoliciesSpaces() {
  return useQuery(['fleet-get-spaces'], async () => {
    return sendRequestForRq({
      method: 'get',
      path: appRoutesService.getAgentPoliciesSpacesPath(),
      version: API_VERSIONS.internal.v1,
    });
  });
}
