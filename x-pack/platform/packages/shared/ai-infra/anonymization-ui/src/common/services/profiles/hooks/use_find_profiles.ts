/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { profilesQueryKeys } from '../cache_keys';
import type { UseFindProfilesParams } from './types';

export const useFindProfiles = ({
  client,
  context,
  query,
  enabled = true,
}: UseFindProfilesParams) =>
  useQuery({
    queryKey: profilesQueryKeys.list(context, query),
    queryFn: () => client.findProfiles(query),
    enabled,
  });
