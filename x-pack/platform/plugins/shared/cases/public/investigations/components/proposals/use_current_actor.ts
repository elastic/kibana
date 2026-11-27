/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { Actor } from '../../../../common/investigations/types';
import { useInvestigationsServices } from '../../services';

/** The signed-in person as an actor, for fields the client records itself (revision history). */
export const useCurrentActor = (): Actor | null => {
  const { security } = useInvestigationsServices();
  const { data } = useQuery(
    ['investigations', 'current_user'],
    () => security.authc.getCurrentUser(),
    { staleTime: Infinity, retry: false }
  );

  if (!data) {
    return null;
  }
  return { type: 'user', id: data.username, name: data.full_name || data.username };
};
