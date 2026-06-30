/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SignificantEvent, SignificantEventInvestigation } from '@kbn/streams-schema';
import { useMutation, useQueryClient } from '@kbn/react-query';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { AGENTBUILDER_APP_ID } from '@kbn/agent-builder-plugin/public';
import { formatTimestamp } from '../../../../../util/formatters';
import { useKibana } from '../../../../../hooks/use_kibana';
import {
  INVESTIGATION_STATUS_COLORS,
  INVESTIGATION_STATUS_LABELS,
} from '../shared/investigation_status';

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
  'xpack.streams.sigEventsTab.flyout.openInvestigationConversation',
  {
    defaultMessage: 'Open conversation',
  }
);
const START_INCIDENT_LABEL = i18n.translate(
  'xpack.streams.sigEventsTab.flyout.startIncidentConversation',
  {
    defaultMessage: 'Start incident',
  }
);
const OPEN_INCIDENT_LABEL = i18n.translate(
  'xpack.streams.sigEventsTab.flyout.openIncidentConversation',
  {
    defaultMessage: 'Open incident',
  }
);
const OUTCOME_LABEL = i18n.translate('xpack.streams.sigEventsTab.flyout.outcomeLabel', {
  defaultMessage: 'Outcome',
});
const CURRENT_STATE_LABEL = i18n.translate('xpack.streams.sigEventsTab.flyout.currentStateLabel', {
  defaultMessage: 'Current state',
});
const INCIDENT_SUCCESS_TOAST_TITLE = i18n.translate(
  'xpack.streams.sigEventsTab.flyout.startIncidentSuccessToastTitle',
  {
    defaultMessage: 'Incident conversation started',
  }
);
const INCIDENT_ERROR_TOAST_TITLE = i18n.translate(
  'xpack.streams.sigEventsTab.flyout.startIncidentErrorToastTitle',
  {
    defaultMessage: 'Failed to start incident',
  }
);

interface CreateIncidentResponse {
  incidentConversation: {
    id: string;
  };
}

const formatDuration = (startedAt: string, completedAt?: string): string => {
  const start = new Date(startedAt).getTime();
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  const diffMs = Math.max(0, end - start);
  return moment.duration(diffMs).humanize();
};

const getConversationPath = (conversationId: string): string => {
  return `/agents/${agentBuilderDefaultAgentId}/conversations/${conversationId}`;
};

const InvestigationRow = ({
  event,
  investigation,
  onIncidentCreated,
}: {
  event: SignificantEvent;
  investigation: SignificantEventInvestigation;
  onIncidentCreated?: () => void;
}) => {
  const {
    core: {
      application,
      http,
      notifications: { toasts },
    },
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();
  const queryClient = useQueryClient();
  const {
    status,
    started_at,
    completed_at,
    conversation_id: conversationId,
    incident_conversation_id: incidentConversationId,
    outcome,
    current_state: currentState,
  } = investigation;
  const duration = formatDuration(started_at, completed_at);
  const isRunning = status === 'pending';
  const conversationUrl = conversationId
    ? application.getUrlForApp(AGENTBUILDER_APP_ID, {
        path: getConversationPath(conversationId),
      })
    : undefined;
  const incidentConversationUrl = incidentConversationId
    ? application.getUrlForApp(AGENTBUILDER_APP_ID, {
        path: getConversationPath(incidentConversationId),
      })
    : undefined;

  const startIncidentMutation = useMutation<CreateIncidentResponse, Error>({
    mutationFn: async () => {
      if (!conversationId) {
        throw new Error('Investigation conversation is missing.');
      }

      const response = await http.post<CreateIncidentResponse>(
        `/internal/observability_agent_builder/investigation_conversations/${conversationId}/incident`
      );

      await streamsRepositoryClient.fetch('POST /internal/sig_events/events/{id}/investigations', {
        params: {
          path: { id: event.event_id },
          body: {
            ...investigation,
            incident_conversation_id: response.incidentConversation.id,
          },
        },
        signal: null,
      });

      return response;
    },
    onSuccess: async () => {
      toasts.addSuccess({ title: INCIDENT_SUCCESS_TOAST_TITLE });
      onIncidentCreated?.();
      await queryClient.invalidateQueries({
        queryKey: ['significantEventLifecycle'],
        exact: false,
      });
    },
    onError: (error) => {
      toasts.addError(error, { title: INCIDENT_ERROR_TOAST_TITLE });
    },
  });

  return (
    <EuiFlexGroup direction="column" gutterSize="xs">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiBadge color={INVESTIGATION_STATUS_COLORS[status]}>
              {INVESTIGATION_STATUS_LABELS[status]}
            </EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem grow>
            <EuiText size="xs" color="subdued">
              {formatTimestamp(started_at)}
              {isRunning ? ` · ${duration} (running)` : completed_at ? ` · ${duration}` : null}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      {outcome || currentState ? (
        <EuiFlexItem grow={false}>
          <EuiText size="xs">
            {outcome ? (
              <p>
                <strong>{OUTCOME_LABEL}:</strong> {outcome}
              </p>
            ) : null}
            {currentState ? (
              <p>
                <strong>{CURRENT_STATE_LABEL}:</strong> {currentState}
              </p>
            ) : null}
          </EuiText>
        </EuiFlexItem>
      ) : null}
      {conversationUrl || incidentConversationUrl ? (
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
            {conversationUrl ? (
              <EuiFlexItem grow={false}>
                <EuiLink href={conversationUrl}>{OPEN_CONVERSATION_LABEL}</EuiLink>
              </EuiFlexItem>
            ) : null}
            {incidentConversationUrl ? (
              <EuiFlexItem grow={false}>
                <EuiLink href={incidentConversationUrl}>{OPEN_INCIDENT_LABEL}</EuiLink>
              </EuiFlexItem>
            ) : conversationId ? (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="xs"
                  iconType="merge"
                  onClick={() => startIncidentMutation.mutate()}
                  isLoading={startIncidentMutation.isLoading}
                  isDisabled={startIncidentMutation.isLoading}
                  data-test-subj="sigEventStartIncidentButton"
                >
                  {START_INCIDENT_LABEL}
                </EuiButtonEmpty>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
};

interface EventInvestigationsProps {
  event: SignificantEvent;
  onIncidentCreated?: () => void;
}

export const EventInvestigations = ({ event, onIncidentCreated }: EventInvestigationsProps) => {
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
            <InvestigationRow
              event={event}
              investigation={investigation}
              onIncidentCreated={onIncidentCreated}
            />
          </EuiFlexItem>
        ))
      )}
    </EuiFlexGroup>
  );
};
