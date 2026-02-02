/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { UseQueryResult } from '@kbn/react-query';

import type { Space } from '../../../common';
import type { SpacesManager } from '../../spaces_manager';

export const SPACES_QUERY_KEY = ['spaces'];

export const useSpaces = (
  spacesManager: SpacesManager,
  enabled: boolean = true
): UseQueryResult<Space[]> => {
  return useQuery({
    queryKey: SPACES_QUERY_KEY,
    queryFn: () => spacesManager.getSpaces(),
    enabled,
  });
};
