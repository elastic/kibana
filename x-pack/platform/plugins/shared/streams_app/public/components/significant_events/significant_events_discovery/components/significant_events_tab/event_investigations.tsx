/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment';
import {
  EuiAccordion,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  SignificantEvent,
  SignificantEventInvestigation,
} from '@kbn/significant-events-schema';
import { InvestigationOutput, useInvestigationState } from '@kbn/investigation-output';
import { formatTimestamp } from '../../../../../util/formatters';
import { useKibana } from '../../../../../hooks/use_kibana';
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

const OPEN_CONVERSATION_LABEL = i18n.translate(
  'xpack.streams.sigEventsTab.flyout.openConversationAriaLabel',
  {
    defaultMessage: 'Open investigation conversation',
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

const InvestigationRow = ({
  investigation,
  initialIsOpen,
}: {
  investigation: SignificantEventInvestigation;
  initialIsOpen: boolean;
}) => {
  const {
    core: { http },
  } = useKibana();
  const { started_at: startedAt, completed_at: completedAt, workflow_execution_id } = investigation;
  const duration = formatDuration(startedAt, completedAt);
  const accordionId = useGeneratedHtmlId({ prefix: 'sigEventInvestigation' });

  /**
   * The hook's `status` is authoritative over the doc-derived flag — it settles as soon as the
   * live stream ends and the final result is fetched, which can happen before the next 5s
   * lifecycle poll updates `completed_at` on the sig-event doc (and, conversely, it keeps
   * showing "running" when the doc lags a run that is actually still going).
   */
  const { state, error, status, conversationId } = useInvestigationState({
    http,
    workflowExecutionId: workflow_execution_id,
    isRunning: isInvestigationRunning(investigation),
  });

  const conversationHref = conversationId
    ? http.basePath.prepend(`/app/agent_builder/conversations/${conversationId}`)
    : undefined;

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
      extraAction={
        conversationHref ? (
          <EuiToolTip content={OPEN_CONVERSATION_LABEL} disableScreenReaderOutput>
            <EuiButtonIcon
              data-test-subj="sigEventInvestigationOpenConversationButton"
              iconType="discuss"
              size="s"
              aria-label={OPEN_CONVERSATION_LABEL}
              href={conversationHref}
              target="_blank"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            />
          </EuiToolTip>
        ) : undefined
      }
    >
      <EuiSpacer size="s" />
      <InvestigationOutput status={status} state={state} error={error} />
    </EuiAccordion>
  );
};

interface EventInvestigationsProps {
  event: SignificantEvent;
}

export const EventInvestigations = ({ event }: EventInvestigationsProps) => {
  const investigations = event.investigations ?? [];

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
