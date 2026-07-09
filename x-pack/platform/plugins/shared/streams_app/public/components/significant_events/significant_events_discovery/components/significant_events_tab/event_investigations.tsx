/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import moment from 'moment';
import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import { getRuleDetailsRoute, triggersActionsRoute } from '@kbn/rule-data-utils';
import type {
  InvestigationReference,
  SignificantEvent,
  SignificantEventInvestigation,
} from '@kbn/significant-events-schema';
import { InvestigationOutput, useInvestigationState } from '@kbn/investigation-output';
import { formatTimestamp } from '../../../../../util/formatters';
import { useKibana } from '../../../../../hooks/use_kibana';
import { useStreamsAppRouter } from '../../../../../hooks/use_streams_app_router';
import { isInvestigationRunning } from '../shared/investigation_status';

const SECTION_TITLE = i18n.translate(
  'xpack.streams.sigEventsTab.flyout.investigationsSectionTitle',
  {
    defaultMessage: 'Investigations',
  }
);

const NO_INVESTIGATIONS_TEXT = i18n.translate(
  'xpack.streams.sigEventsTab.flyout.noInvestigations',
  {
    defaultMessage: 'No investigations yet.',
  }
);

const getRunningDurationText = (duration: string): string =>
  i18n.translate('xpack.streams.sigEventsTab.flyout.investigationRunningDuration', {
    defaultMessage: '{duration} (running)',
    values: { duration },
  });

const formatDuration = (startedAt: string, completedAt?: string): string => {
  const start = new Date(startedAt).getTime();
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  const diffMs = Math.max(0, end - start);
  return moment.duration(diffMs).humanize();
};

/**
 * Resolves references on investigation-trail nodes into links back to the real thing:
 * - `query` — a Discover link running the exact ES|QL, scoped to the time range the agent
 *   evaluated it over (last 24h as a fallback).
 * - `ki` — the Knowledge Indicators tab pre-filtered to the referenced indicator's name (the
 *   reference carries the KI's name, not its id, so a search filter is the stable target).
 * - `rule` — the rule's details page in Rules management, when the agent supplied its uuid.
 */
const useReferenceHref = () => {
  const {
    core: { http },
    dependencies: {
      start: { share },
    },
  } = useKibana();
  const router = useStreamsAppRouter();

  return useCallback(
    (reference: InvestigationReference): string | undefined => {
      switch (reference.type) {
        case 'query': {
          if (!reference.esql) return undefined;
          const discoverLocator =
            share.url.locators.get<DiscoverAppLocatorParams>(DISCOVER_APP_LOCATOR);
          return discoverLocator?.getRedirectUrl({
            query: { esql: reference.esql },
            timeRange: reference.time_range ?? { from: 'now-24h', to: 'now' },
          });
        }
        case 'ki': {
          if (!reference.ki_name) return undefined;
          return router.link('/_discovery/{tab}', {
            path: { tab: 'knowledge_indicators' },
            query: {
              search: reference.ki_name,
              // Entity/infrastructure KIs are inferred (non-computed) features, but the
              // reference doesn't say which kind it is — show computed ones too so the
              // filtered list is guaranteed to contain the target.
              showComputed: 'true',
            },
          });
        }
        case 'rule': {
          if (!reference.rule_uuid) return undefined;
          return http.basePath.prepend(
            `${triggersActionsRoute}${getRuleDetailsRoute(reference.rule_uuid)}`
          );
        }
      }
    },
    [share.url.locators, router, http.basePath]
  );
};

/**
 * Fetches the live/replayed investigation stream and everything `InvestigationOutput` needs to
 * render it. Shared by the bare single-investigation case and the per-row accordion used when
 * there's more than one.
 */
const useInvestigationOutputProps = (investigation: SignificantEventInvestigation) => {
  const {
    core: { http },
  } = useKibana();
  const getReferenceHref = useReferenceHref();

  /**
   * The hook's `status` is authoritative over the doc-derived flag — it settles as soon as the
   * live stream ends and the final result is fetched, which can happen before the next 5s
   * lifecycle poll updates `completed_at` on the sig-event doc (and, conversely, it keeps
   * showing "running" when the doc lags a run that is actually still going).
   */
  const { state, error, status } = useInvestigationState({
    http,
    workflowExecutionId: investigation.workflow_execution_id,
    isRunning: isInvestigationRunning(investigation),
  });

  return { state, error, status, getReferenceHref };
};

const InvestigationContent = ({
  investigation,
}: {
  investigation: SignificantEventInvestigation;
}) => {
  const { state, error, status, getReferenceHref } = useInvestigationOutputProps(investigation);

  return (
    <InvestigationOutput
      status={status}
      state={state}
      error={error}
      getReferenceHref={getReferenceHref}
    />
  );
};

const InvestigationRow = ({
  investigation,
  initialIsOpen,
}: {
  investigation: SignificantEventInvestigation;
  initialIsOpen: boolean;
}) => {
  const { state, error, status, getReferenceHref } = useInvestigationOutputProps(investigation);
  const { started_at: startedAt, completed_at: completedAt } = investigation;
  const duration = formatDuration(startedAt, completedAt);
  const accordionId = useGeneratedHtmlId({ prefix: 'sigEventInvestigation' });

  return (
    <EuiAccordion
      id={accordionId}
      initialIsOpen={initialIsOpen}
      data-test-subj="sigEventInvestigationRow"
      buttonContent={
        <EuiText size="xs" color="subdued">
          {formatTimestamp(startedAt)}
          {status === 'running'
            ? ` · ${getRunningDurationText(duration)}`
            : completedAt
            ? ` · ${duration}`
            : null}
        </EuiText>
      }
    >
      <EuiSpacer size="s" />
      <InvestigationOutput
        status={status}
        state={state}
        error={error}
        getReferenceHref={getReferenceHref}
      />
    </EuiAccordion>
  );
};

interface EventInvestigationsProps {
  event: SignificantEvent;
}

/**
 * When there's exactly one investigation, the "Investigations" title and the per-row accordion
 * (timestamp/duration button) are pure overhead — nothing to disambiguate — so the output is
 * shown directly. With zero or multiple investigations, the wrapper still earns its place.
 */
export const EventInvestigations = ({ event }: EventInvestigationsProps) => {
  const investigations = event.investigations ?? [];

  if (investigations.length === 1) {
    return <InvestigationContent investigation={investigations[0]} />;
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      <EuiFlexItem grow={false}>
        <EuiTitle size="xs">
          <h3>{SECTION_TITLE}</h3>
        </EuiTitle>
      </EuiFlexItem>
      {investigations.length === 0 ? (
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued">
            <p>{NO_INVESTIGATIONS_TEXT}</p>
          </EuiText>
        </EuiFlexItem>
      ) : (
        investigations.map((investigation, index) => (
          <EuiFlexItem key={investigation.workflow_execution_id} grow={false}>
            <InvestigationRow
              investigation={investigation}
              initialIsOpen={index === investigations.length - 1}
            />
          </EuiFlexItem>
        ))
      )}
    </EuiFlexGroup>
  );
};
