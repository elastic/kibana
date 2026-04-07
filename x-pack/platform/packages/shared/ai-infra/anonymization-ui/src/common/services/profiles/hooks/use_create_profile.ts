/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateAnonymizationProfileRequest } from '@kbn/anonymization-common';
import { useMutation, useQueryClient } from '@kbn/react-query';
import { profilesQueryKeys } from '../cache_keys';
import type { UseProfilesParams } from './types';

export const useCreateProfile = ({ client, context }: UseProfilesParams) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateAnonymizationProfileRequest) => client.createProfile(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: profilesQueryKeys.root(context) }),
  });
};
