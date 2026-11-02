/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAvatar,
  EuiBadge,
  EuiButtonIcon,
  EuiComboBox,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPanel,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useEffect } from 'react';
import { useAgentBuilderAgents } from '../../hooks/use_agent_builder_agents';
import { useAiIndexOptions } from './use_ai_index_options';
import { useSessionContext } from './session_context';

const labels = {
  sessionId: i18n.translate('xpack.contextEngine.sessionMemory.context.sessionId', {
    defaultMessage: 'Session',
  }),
  newSession: i18n.translate('xpack.contextEngine.sessionMemory.context.newSession', {
    defaultMessage: 'Start a new session',
  }),
  agent: i18n.translate('xpack.contextEngine.sessionMemory.context.agent', {
    defaultMessage: 'Agent',
  }),
  agentPlaceholder: i18n.translate('xpack.contextEngine.sessionMemory.context.agentPlaceholder', {
    defaultMessage: 'Select or type an agent id',
  }),
  aiIndex: i18n.translate('xpack.contextEngine.sessionMemory.context.aiIndex', {
    defaultMessage: 'AI indices',
  }),
  aiIndexPlaceholder: i18n.translate(
    'xpack.contextEngine.sessionMemory.context.aiIndexPlaceholder',
    { defaultMessage: 'Optional: select or type AI index ids' }
  ),
};

/**
 * The shared identity strip above the panels: who (current user), where (current space), and the
 * session, agent, and AI index every remember, search, and event call is scoped to.
 */
export const SessionContextBar = () => {
  const {
    userId,
    spaceId,
    sessionId,
    setSessionId,
    newSession,
    agentId,
    setAgentId,
    aiIndexIds,
    setAiIndexIds,
  } = useSessionContext();
  const { agents, isLoading: isLoadingAgents } = useAgentBuilderAgents();
  const { options: aiIndexOptions, isLoading: isLoadingAiIndices } = useAiIndexOptions();

  // Default to the Elastic AI agent once the list arrives; the list also holds platform agents
  // (e.g. Context Engine's own setup agent) that are not sensible authors of a manual memory.
  useEffect(() => {
    if (agentId || agents.length === 0) {
      return;
    }
    const defaultAgent = agents.find((agent) => agent.id === agentBuilderDefaultAgentId);
    setAgentId((defaultAgent ?? agents[0]).id);
  }, [agentId, agents, setAgentId]);

  const agentOptions = agents.map((agent) => ({ label: agent.id, value: agent.id }));

  return (
    <EuiPanel color="subdued" hasBorder paddingSize="m" data-test-subj="contextSessionContextBar">
      <EuiFlexGroup gutterSize="m" alignItems="flexEnd" wrap>
        <EuiFlexItem grow={false}>
          <EuiFormRow
            label={i18n.translate('xpack.contextEngine.sessionMemory.context.identity', {
              defaultMessage: 'Identity',
            })}
          >
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiAvatar name={userId ?? '?'} size="s" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s" data-test-subj="contextSessionContextUser">
                  <strong>{userId ?? '…'}</strong>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge
                  color="hollow"
                  iconType="grid"
                  data-test-subj="contextSessionContextSpace"
                >
                  {spaceId ?? '…'}
                </EuiBadge>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow label={labels.sessionId} fullWidth>
            <EuiFieldText
              fullWidth
              compressed
              value={sessionId}
              onChange={(event) => setSessionId(event.target.value)}
              append={
                <EuiToolTip content={labels.newSession} disableScreenReaderOutput>
                  <EuiButtonIcon
                    iconType="refresh"
                    aria-label={labels.newSession}
                    onClick={newSession}
                    data-test-subj="contextSessionContextNewSession"
                  />
                </EuiToolTip>
              }
              data-test-subj="contextSessionContextSessionId"
              aria-label={labels.sessionId}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow label={labels.agent} fullWidth>
            <EuiComboBox
              fullWidth
              compressed
              singleSelection={{ asPlainText: true }}
              isLoading={isLoadingAgents}
              options={agentOptions}
              selectedOptions={agentId ? [{ label: agentId, value: agentId }] : []}
              onChange={(selected) => setAgentId(selected[0]?.label ?? '')}
              onCreateOption={(created) => setAgentId(created.trim())}
              placeholder={labels.agentPlaceholder}
              data-test-subj="contextSessionContextAgent"
              aria-label={labels.agent}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow label={labels.aiIndex} fullWidth>
            <EuiComboBox
              fullWidth
              compressed
              isLoading={isLoadingAiIndices}
              options={aiIndexOptions}
              selectedOptions={aiIndexIds.map((id) => ({ label: id, value: id }))}
              onChange={(selected) => setAiIndexIds(selected.map((option) => option.label))}
              onCreateOption={(created) => {
                const id = created.trim();
                if (id && !aiIndexIds.includes(id)) {
                  setAiIndexIds([...aiIndexIds, id]);
                }
              }}
              placeholder={labels.aiIndexPlaceholder}
              data-test-subj="contextSessionContextAiIndex"
              aria-label={labels.aiIndex}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiText size="xs" color="subdued">
        <p>
          <FormattedMessage
            id="xpack.contextEngine.sessionMemory.context.help"
            defaultMessage="Memories and events are written for this user, space, session, and agent. The session id is generated per visit; edit it to continue an earlier session."
          />
        </p>
      </EuiText>
    </EuiPanel>
  );
};
