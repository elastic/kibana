/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { ProposalOrigin } from '@kbn/proposals-common';
import { queryKeys as proposalsQueryKeys } from '@kbn/proposals-plugin/public';
import type { ImpactPill } from '@kbn/agentic-investigations-common';
import {
  AGENTIC_INVESTIGATIONS_API_VERSION,
  IMPACT_ESCALATION_PILLS_URL,
  IMPACT_PROPOSAL_PILLS_URL,
} from '../../../common';
import type { ImpactPillsResponse } from '../../../common';
import { escalationQueryKeys } from '../../escalations/query_keys';
import { retryOnTransientError } from '../../retry_on_transient_error';

const IMPACT_PILLS_POLL_INTERVAL_MS = 60_000;

/**
 * The entities across a whole proposal queue: the open proposals of `categories`, plus those
 * decided within `decidedWithinHours`. Independent of which rows a view has loaded. Keyed under
 * the proposals root, so a decision refreshes it.
 */
export const useProposalImpactPills = ({
  origin,
  categories,
  decidedWithinHours,
}: {
  origin: ProposalOrigin;
  categories: readonly string[];
  decidedWithinHours?: number;
}) => {
  const { services } = useKibana<CoreStart>();

  return useQuery({
    queryKey: [
      ...proposalsQueryKeys.proposals.all,
      'impact-pills',
      origin,
      categories,
      decidedWithinHours ?? null,
    ],
    queryFn: async (): Promise<ImpactPill[]> => {
      const { pills } = await services.http.get<ImpactPillsResponse>(IMPACT_PROPOSAL_PILLS_URL, {
        version: AGENTIC_INVESTIGATIONS_API_VERSION,
        query: {
          origin,
          categories: [...categories],
          ...(decidedWithinHours !== undefined ? { decidedWithinHours } : {}),
        },
      });
      return pills;
    },
    refetchInterval: IMPACT_PILLS_POLL_INTERVAL_MS,
    keepPreviousData: true,
    retry: retryOnTransientError,
  });
};

/** The entities across every open and closed escalation. */
export const useEscalationImpactPills = ({ enabled = true }: { enabled?: boolean } = {}) => {
  const { services } = useKibana<CoreStart>();

  return useQuery({
    queryKey: escalationQueryKeys.impactPills(),
    queryFn: async (): Promise<ImpactPill[]> => {
      const { pills } = await services.http.get<ImpactPillsResponse>(IMPACT_ESCALATION_PILLS_URL, {
        version: AGENTIC_INVESTIGATIONS_API_VERSION,
      });
      return pills;
    },
    enabled,
    refetchInterval: IMPACT_PILLS_POLL_INTERVAL_MS,
    keepPreviousData: true,
    retry: retryOnTransientError,
  });
};
