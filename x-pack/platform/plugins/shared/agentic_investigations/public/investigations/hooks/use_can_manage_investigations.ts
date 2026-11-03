/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart, HttpStart } from '@kbn/core/public';
import {
  AGENTIC_INVESTIGATIONS_API_VERSION,
  INVESTIGATIONS_PRIVILEGES_URL,
  type InvestigationsPrivilegesResponse,
} from '../../../common';
import { getAgenticInvestigationsCapabilities } from '../../hooks/use_agentic_investigations_capabilities';
import { investigationQueryKeys } from '../query_keys';

// The privileges of the signed-in user do not change during a page's life, so every flyout
// shares one request, even though each has its own QueryClient.
let privilegesPromise: Promise<InvestigationsPrivilegesResponse> | undefined;

export const fetchInvestigationsPrivileges = (
  http: HttpStart
): Promise<InvestigationsPrivilegesResponse> => {
  if (!privilegesPromise) {
    privilegesPromise = http
      .get<InvestigationsPrivilegesResponse>(INVESTIGATIONS_PRIVILEGES_URL, {
        version: AGENTIC_INVESTIGATIONS_API_VERSION,
      })
      .catch((error) => {
        privilegesPromise = undefined;
        throw error;
      });
  }
  return privilegesPromise;
};

/** Test seam: forgets the cached privileges. */
export const resetInvestigationsPrivilegesCache = (): void => {
  privilegesPromise = undefined;
};

/**
 * The caller's investigation and escalation API privileges, requested only when `enabled`: the
 * hooks below enable it only when the UI capability that would answer is missing.
 */
export const useInvestigationsPrivileges = (
  enabled: boolean
): InvestigationsPrivilegesResponse | undefined => {
  const {
    services: { http },
  } = useKibana<CoreStart>();

  const { data } = useQuery({
    queryKey: investigationQueryKeys.privileges(),
    queryFn: () => fetchInvestigationsPrivileges(http),
    enabled,
    staleTime: Infinity,
    retry: false,
  });

  return data;
};

/**
 * Whether the user may change an investigation (status, assignees, close). The agentic
 * investigations UI capability answers directly; a user who holds the API privilege through
 * another feature (for example AlertZero or Nightshift) lacks that capability, so the API is
 * asked instead. The request is made only in that case, from inside the flyout.
 */
export const useCanManageInvestigations = (): boolean => {
  const {
    services: { application },
  } = useKibana<CoreStart>();
  const { manageInvestigations } = getAgenticInvestigationsCapabilities(application.capabilities);
  const privileges = useInvestigationsPrivileges(!manageInvestigations);

  return manageInvestigations || privileges?.investigations.manage === true;
};
