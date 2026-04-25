/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useAssistantContext } from '../../..';

export const useUserProfiles = (uids: string[]) => {
  const { userProfileService } = useAssistantContext();
  return useQuery({
    queryKey: ['bulkGetUsers', ...uids],
    queryFn: async () =>
      userProfileService.bulkGet({
        uids: new Set(uids),
        dataPath: 'avatar',
      }),
    enabled: uids.length > 0,
    keepPreviousData: false,
    refetchOnWindowFocus: false,
  });
};
