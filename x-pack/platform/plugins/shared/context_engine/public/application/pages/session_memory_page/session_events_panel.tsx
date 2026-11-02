/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiEmptyPrompt,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiPanel,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnDangerCallout, KbnSuccessCallout } from '@kbn/ui-callout';
import React, { useState } from 'react';
import type {
  SaveSessionEventBody,
  SessionEvent,
} from '../../../../common/http_api/session_memory';
import { useSaveSessionEvent } from '../../hooks/use_session_memory_mutations';
import { useSessionEvents } from '../../hooks/use_session_events';
import { getErrorMessage } from '../../utils/get_error_message';
import { EMPTY_SESSION_SCOPE, SessionScopeFields, hasRequiredScope } from './session_scope_fields';
import type { SessionScope } from './session_scope_fields';

const labels = {
  roundId: i18n.translate('xpack.contextEngine.sessionMemory.events.roundId', {
    defaultMessage: 'Round ID',
  }),
  optional: i18n.translate('xpack.contextEngine.sessionMemory.events.optional', {
    defaultMessage: 'Optional',
  }),
  transcript: i18n.translate('xpack.contextEngine.sessionMemory.events.transcript', {
    defaultMessage: 'Transcript',
  }),
  submit: i18n.translate('xpack.contextEngine.sessionMemory.events.submit', {
    defaultMessage: 'Save event',
  }),
  load: i18n.translate('xpack.contextEngine.sessionMemory.events.load', {
    defaultMessage: 'Load events',
  }),
  errorTitle: i18n.translate('xpack.contextEngine.sessionMemory.events.errorTitle', {
    defaultMessage: 'Unable to load session events',
  }),
};

export const buildSaveEventBody = (
  scope: SessionScope,
  { roundId, transcript }: { roundId: string; transcript: string }
): SaveSessionEventBody => ({
  session_id: scope.sessionId.trim(),
  user_id: scope.userId.trim(),
  agent_id: scope.agentId.trim(),
  ...(roundId.trim() ? { round_id: roundId.trim() } : {}),
  ...(scope.space.trim() ? { space: scope.space.trim() } : {}),
  ...(scope.aiIndexIds.length ? { ai_index_id: scope.aiIndexIds } : {}),
  transcript,
});

const SessionEventRow = ({ event }: { event: SessionEvent }) => (
  <EuiPanel hasBorder paddingSize="m" data-test-subj="contextSessionEventRow">
    <EuiFlexGroup gutterSize="xs" wrap responsive={false} alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued">
          {event['@timestamp']}
        </EuiText>
      </EuiFlexItem>
      {event.round_id && (
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">{event.round_id}</EuiBadge>
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <EuiBadge color="hollow">{event.agent_id}</EuiBadge>
      </EuiFlexItem>
    </EuiFlexGroup>
    <EuiSpacer size="s" />
    <EuiCodeBlock paddingSize="s" fontSize="s" overflowHeight={160} isCopyable>
      {event.transcript}
    </EuiCodeBlock>
  </EuiPanel>
);

export const SessionEventsPanel = () => {
  const [scope, setScope] = useState<SessionScope>(EMPTY_SESSION_SCOPE);
  const [roundId, setRoundId] = useState('');
  const [transcript, setTranscript] = useState('');
  // The list is scoped to the session id the user last loaded or saved to, not to every keystroke.
  const [listedScope, setListedScope] = useState<SessionScope | undefined>();
  const { mutate, isLoading: isSaving, data: saved } = useSaveSessionEvent();
  const { events, count, isLoading, error } = useSessionEvents({
    sessionId: listedScope?.sessionId.trim() ?? '',
    space: listedScope?.space.trim() || undefined,
    aiIndexId: listedScope?.aiIndexIds[0],
  });

  const canSubmit = hasRequiredScope(scope) && transcript.trim().length > 0;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }
    mutate(buildSaveEventBody(scope, { roundId, transcript }), {
      onSuccess: () => {
        setTranscript('');
        setListedScope(scope);
      },
    });
  };

  return (
    <EuiPanel hasBorder paddingSize="l" data-test-subj="contextSessionEventsPanel">
      <EuiTitle size="s">
        <h2>
          <FormattedMessage
            id="xpack.contextEngine.sessionMemory.events.title"
            defaultMessage="Session events"
          />
        </h2>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <EuiText size="s" color="subdued">
        <p>
          <FormattedMessage
            id="xpack.contextEngine.sessionMemory.events.description"
            defaultMessage="Save a raw transcript for a session and list the session's events, newest first. Events are stored as-is; no inference runs on them."
          />
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiForm component="form" onSubmit={submit}>
        <SessionScopeFields
          value={scope}
          onChange={setScope}
          required
          isDisabled={isSaving}
          data-test-subj="contextSessionEvents"
        />
        <EuiFormRow label={labels.roundId} labelAppend={labels.optional} fullWidth>
          <EuiFieldText
            fullWidth
            compressed
            value={roundId}
            onChange={(event) => setRoundId(event.target.value)}
            disabled={isSaving}
            data-test-subj="contextSessionEvents-roundId"
            aria-label={labels.roundId}
          />
        </EuiFormRow>
        <EuiFormRow label={labels.transcript} fullWidth>
          <EuiTextArea
            fullWidth
            compressed
            rows={4}
            value={transcript}
            onChange={(event) => setTranscript(event.target.value)}
            disabled={isSaving}
            data-test-subj="contextSessionEvents-transcript"
            aria-label={labels.transcript}
          />
        </EuiFormRow>
        <EuiSpacer size="m" />
        <EuiFlexGroup gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButton
              type="submit"
              fill
              isLoading={isSaving}
              isDisabled={!canSubmit}
              data-test-subj="contextSessionEvents-submit"
            >
              {labels.submit}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="refresh"
              isDisabled={scope.sessionId.trim().length === 0}
              onClick={() => setListedScope({ ...scope })}
              data-test-subj="contextSessionEvents-load"
            >
              {labels.load}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiForm>
      {saved && (
        <>
          <EuiSpacer size="m" />
          <KbnSuccessCallout
            announceOnMount
            title={i18n.translate('xpack.contextEngine.sessionMemory.events.successTitle', {
              defaultMessage: 'Saved event {id} at {timestamp}',
              values: { id: saved.id, timestamp: saved['@timestamp'] },
            })}
            data-test-subj="contextSessionEvents-success"
          />
        </>
      )}
      {listedScope && (
        <>
          <EuiSpacer size="l" />
          <EuiTitle size="xs">
            <h3 data-test-subj="contextSessionEvents-listTitle">
              <FormattedMessage
                id="xpack.contextEngine.sessionMemory.events.listTitle"
                defaultMessage="Events for {sessionId} ({count})"
                values={{ sessionId: listedScope.sessionId.trim(), count }}
              />
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          {error ? (
            <KbnDangerCallout
              announceOnMount
              title={labels.errorTitle}
              data-test-subj="contextSessionEvents-error"
            >
              {getErrorMessage(error)}
            </KbnDangerCallout>
          ) : isLoading ? (
            <EuiSkeletonText lines={3} data-test-subj="contextSessionEvents-loading" />
          ) : events.length === 0 ? (
            <EuiEmptyPrompt
              titleSize="xs"
              title={
                <h4>
                  <FormattedMessage
                    id="xpack.contextEngine.sessionMemory.events.empty"
                    defaultMessage="No events for this session"
                  />
                </h4>
              }
              data-test-subj="contextSessionEvents-empty"
            />
          ) : (
            <EuiFlexGroup
              direction="column"
              gutterSize="s"
              data-test-subj="contextSessionEvents-list"
            >
              {events.map((event) => (
                <EuiFlexItem key={event.id}>
                  <SessionEventRow event={event} />
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          )}
        </>
      )}
    </EuiPanel>
  );
};
