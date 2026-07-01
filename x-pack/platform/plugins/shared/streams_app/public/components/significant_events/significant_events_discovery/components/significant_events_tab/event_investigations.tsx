/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  SignificantEvent,
  SignificantEventInvestigation,
} from '@kbn/significant-events-schema';
import { InvestigationOutput, useInvestigationState } from '@kbn/investigation-output';
import { formatTimestamp } from '../../../../../util/formatters';
import { useKibana } from '../../../../../hooks/use_kibana';

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

const formatDuration = (startedAt: string, completedAt?: string): string => {
  const start = new Date(startedAt).getTime();
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  const diffMs = Math.max(0, end - start);
  return moment.duration(diffMs).humanize();
};

const InvestigationRow = ({ investigation }: { investigation: SignificantEventInvestigation }) => {
  const {
    core: { http },
  } = useKibana();
  const { started_at: startedAt, completed_at: completedAt, workflow_execution_id } = investigation;
  const duration = formatDuration(startedAt, completedAt);
  const isRunning = completedAt == null;

  const { state, error } = useInvestigationState({
    http,
    executionId: workflow_execution_id,
    isRunning,
  });

  return (
    <EuiFlexGroup direction="column" gutterSize="xs">
      <EuiFlexItem grow={false}>
        <InvestigationOutput isRunning={isRunning} state={state} error={error} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued">
          {formatTimestamp(startedAt)}
          {isRunning ? ` · ${duration} (running)` : completedAt ? ` · ${duration}` : null}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

interface EventInvestigationsProps {
  event: SignificantEvent;
}

export const EventInvestigations = ({ event }: EventInvestigationsProps) => {
  const investigations = event.investigations ?? [];

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
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
        investigations.map((investigation) => (
          <EuiFlexItem key={investigation.workflow_execution_id} grow={false}>
            <InvestigationRow investigation={investigation} />
          </EuiFlexItem>
        ))
      )}
    </EuiFlexGroup>
  );
};
