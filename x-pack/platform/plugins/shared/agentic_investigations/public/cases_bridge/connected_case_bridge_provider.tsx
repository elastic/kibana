/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { useQuery } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { CasesPublicStart } from '@kbn/cases-plugin/public';
import {
  CaseBridgeProvider,
  type CaseBridgeContextValue,
} from '@kbn/agentic-investigations-common';
import { fetchLinkedInvestigationSummaries, formatCaseNumber, getCaseHref } from './api';
import { ACTIONS_VIEW_CASE, CASE_BADGE } from './translations';

export interface CaseSummary {
  id: string;
  title: string;
  incremental_id?: number | null;
  status: string;
  access?: { mode?: string } | null;
}

export interface CaseSummaries {
  byId: Map<string, CaseSummary>;
  /** Ids a finished request asked for and didn't get back: deleted, or not visible to the viewer. */
  unavailable: Set<string>;
}

/**
 * Reads the cases these investigations link to, in one request. A case that is missing or that the
 * viewer can't see (restricted) comes back as an error and renders as "Case unavailable".
 */
const useCaseSummaries = (caseIds: string[]) => {
  const { services } = useKibana<CoreStart & { cases?: CasesPublicStart }>();
  return useQuery({
    queryKey: ['agenticInvestigations', 'casesBridge', 'caseSummaries', caseIds],
    queryFn: async ({ signal }): Promise<CaseSummaries> => {
      if (!services.cases) {
        return { byId: new Map(), unavailable: new Set() };
      }
      const { cases } = await services.cases.api.cases.bulkGet({ ids: caseIds }, signal);
      const byId = new Map<string, CaseSummary>(cases.map((theCase) => [theCase.id, theCase]));
      return { byId, unavailable: new Set(caseIds.filter((id) => !byId.has(id))) };
    },
    enabled: caseIds.length > 0,
    staleTime: 30_000,
    keepPreviousData: true,
  });
};

/**
 * `undefined` while the case hasn't been read yet (including while a newer batch loads over the
 * previous one), `null` once a finished read asked for it and didn't get it back.
 */
export const lookUpCase = (
  summaries: CaseSummaries | undefined,
  caseId: string
): CaseSummary | null | undefined => {
  const theCase = summaries?.byId.get(caseId);
  if (theCase != null) {
    return theCase;
  }
  return summaries?.unavailable.has(caseId) ? null : undefined;
};

const CaseBadge: React.FC<{ caseId: string; summaries?: CaseSummaries }> = ({
  caseId,
  summaries,
}) => {
  const { services } = useKibana<CoreStart>();
  const theCase = lookUpCase(summaries, caseId);
  if (theCase === undefined) {
    // The id is known before the case number; show nothing until it loads.
    return null;
  }
  if (theCase === null) {
    return (
      <EuiToolTip content={CASE_BADGE.unavailableTooltip}>
        <EuiBadge color="hollow" tabIndex={0} data-test-subj="caseBridgeCaseUnavailable">
          {CASE_BADGE.unavailable}
        </EuiBadge>
      </EuiToolTip>
    );
  }
  const href = getCaseHref(services.application, caseId);
  // Cases numbers a case shortly after it opens; until then the badge just says Case, with the
  // title on hover.
  const label =
    theCase.incremental_id != null
      ? CASE_BADGE.caseNumber(`#${theCase.incremental_id}`)
      : CASE_BADGE.caseUnnumbered;
  return (
    <EuiBadge
      color="hollow"
      iconType="casesApp"
      onClick={(event: React.MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        void services.application.navigateToUrl(href);
      }}
      onClickAriaLabel={label}
      title={theCase.title}
      data-test-subj="caseBridgeCaseBadge"
    >
      {label}
    </EuiBadge>
  );
};

/**
 * Gives AlertZero's queue cards, card menus, and flyout the case actions instead of the
 * escalation ones. `caseIds` are the cases of the investigations on screen.
 */
export const ConnectedCaseBridgeProvider: React.FC<{
  caseIds?: string[];
  /** Investigations known only by conversation id; their cases are looked up in one request. */
  conversationIds?: string[];
  children: ReactNode;
}> = ({ caseIds = [], conversationIds = [], children }) => {
  const { services } = useKibana<CoreStart>();
  const uniqueConversationIds = useMemo(
    () => [...new Set(conversationIds)].sort(),
    [conversationIds]
  );
  const { data: caseIdByConversation } = useQuery({
    queryKey: [
      'agenticInvestigations',
      'casesBridge',
      'caseIdsByConversation',
      uniqueConversationIds,
    ],
    queryFn: async ({ signal }) => {
      const summaries = await fetchLinkedInvestigationSummaries(
        services.http,
        uniqueConversationIds,
        signal
      );
      return new Map(
        [...summaries.values()].flatMap(({ id, metadata }) =>
          metadata.case_id ? [[id, metadata.case_id] as const] : []
        )
      );
    },
    enabled: uniqueConversationIds.length > 0,
    staleTime: 15_000,
    // Loading more cards changes the ids; keep the badges on screen meanwhile.
    keepPreviousData: true,
  });
  const uniqueIds = useMemo(
    () => [...new Set([...caseIds, ...(caseIdByConversation?.values() ?? [])])].sort(),
    [caseIds, caseIdByConversation]
  );
  const { data: summaries } = useCaseSummaries(uniqueIds);

  const onViewCase = useCallback(
    (caseId: string) => {
      void services.application.navigateToUrl(getCaseHref(services.application, caseId));
    },
    [services.application]
  );

  const value = useMemo<CaseBridgeContextValue>(
    () => ({
      renderCaseBadge: ({ caseId }) => <CaseBadge caseId={caseId} summaries={summaries} />,
      onViewCase,
      getViewCaseLabel: (caseId) => {
        const theCase = summaries?.byId.get(caseId);
        return theCase?.incremental_id != null
          ? ACTIONS_VIEW_CASE(formatCaseNumber(theCase))
          : undefined;
      },
      resolveCaseId: (conversationId) => caseIdByConversation?.get(conversationId),
      getCaseSummary: (caseId) => {
        const theCase = lookUpCase(summaries, caseId);
        if (theCase == null) {
          return theCase;
        }
        return {
          title: theCase.title,
          incrementalId: theCase.incremental_id ?? undefined,
          status: theCase.status,
          isRestricted: theCase.access?.mode === 'restricted',
        };
      },
    }),
    [summaries, onViewCase, caseIdByConversation]
  );

  return <CaseBridgeProvider value={value}>{children}</CaseBridgeProvider>;
};
