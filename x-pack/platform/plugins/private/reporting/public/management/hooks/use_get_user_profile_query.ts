/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import { queryKeys } from '../query_keys';

export const getKey = queryKeys.getUserProfile;

export const useGetUserProfileQuery = ({
  userProfileService,
}: {
  userProfileService?: UserProfileService;
}) => {
  return useQuery({
    queryKey: getKey(),
    queryFn: () => userProfileService!.getCurrent(),
    enabled: Boolean(userProfileService),
  });
};
