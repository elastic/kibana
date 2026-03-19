/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  EuiTitle,
  EuiSpacer,
  EuiFieldText,
  EuiButtonIcon,
  EuiButtonEmpty,
  EuiLoadingSpinner,
  EuiCallOut,
  EuiComment,
  EuiCommentList,
  EuiBadge,
  EuiSuperSelect,
  EuiHorizontalRule,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { useChatEditPipeline, useLoadConnectors } from '../../../../common';
import type { ChatEditPipelineResponse } from '../../../../common';
import * as i18n from './translations';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  pipeline?: Record<string, unknown>;
  validationResults?: ChatEditPipelineResponse['validationResults'];
  applied?: boolean;
}

interface PipelineChatPanelProps {
  integrationId: string;
  dataStreamId: string;
  connectorId?: string;
  pipelineText: string;
  onApplyPipeline: (pipeline: string) => void;
}

export const PipelineChatPanel: React.FC<PipelineChatPanelProps> = ({
  integrationId,
  dataStreamId,
  connectorId: externalConnectorId,
  pipelineText,
  onApplyPipeline,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [selectedConnectorId, setSelectedConnectorId] = useState(externalConnectorId ?? '');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { chatEditPipelineMutation } = useChatEditPipeline();
  const { connectors, isLoading: connectorsLoading } = useLoadConnectors();

  const activeConnectorId = externalConnectorId || selectedConnectorId;
  const showConnectorSelector = !externalConnectorId;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || !activeConnectorId) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');

    let currentPipeline: Record<string, unknown>;
    try {
      currentPipeline = JSON.parse(pipelineText);
    } catch {
      currentPipeline = { processors: [] };
    }

    const conversationHistory = messages.map((m) => ({
      role: m.role,
      content:
        m.role === 'assistant' && m.applied
          ? '[Changes from this response have already been applied to the current pipeline.]'
          : m.content,
    }));

    try {
      const result = await chatEditPipelineMutation.mutateAsync({
        integrationId,
        dataStreamId,
        connectorId: activeConnectorId,
        currentPipeline,
        userMessage: trimmed,
        conversationHistory,
      });

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: result.explanation,
        pipeline: result.updatedPipeline,
        validationResults: result.validationResults,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: err instanceof Error ? err.message : 'An unexpected error occurred.',
      };

      setMessages((prev) => [...prev, errorMessage]);
    }
  }, [
    inputValue,
    activeConnectorId,
    pipelineText,
    messages,
    chatEditPipelineMutation,
    integrationId,
    dataStreamId,
  ]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleApply = useCallback(
    (messageId: string, pipeline: Record<string, unknown>) => {
      onApplyPipeline(JSON.stringify(pipeline, null, 2));
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, applied: true } : m)));
    },
    [onApplyPipeline]
  );

  const connectorOptions = connectors.map((c) => ({
    value: c.id,
    inputDisplay: c.name,
    dropdownDisplay: c.name,
  }));

  return (
    <EuiPanel
      paddingSize="s"
      hasShadow={false}
      hasBorder
      className={css`
        display: flex;
        flex-direction: column;
        height: 100%;
        min-width: 320px;
        max-width: 400px;
      `}
    >
      <EuiTitle size="xxs">
        <h3>{i18n.AI_CHAT_PANEL.title}</h3>
      </EuiTitle>
      <EuiSpacer size="s" />

      {showConnectorSelector && (
        <>
          <EuiSuperSelect
            options={connectorOptions}
            valueOfSelected={selectedConnectorId}
            onChange={setSelectedConnectorId}
            isLoading={connectorsLoading}
            compressed
            fullWidth
            placeholder="Select AI connector"
          />
          <EuiSpacer size="s" />
        </>
      )}

      {!activeConnectorId && (
        <EuiCallOut size="s" color="warning" iconType="warning">
          <p>{i18n.AI_CHAT_PANEL.connectorRequired}</p>
        </EuiCallOut>
      )}

      <EuiFlexItem
        grow
        className={css`
          overflow-y: auto;
          min-height: 0;
        `}
      >
        {messages.length > 0 ? (
          <EuiCommentList>
            {messages.map((msg) => (
              <EuiComment
                key={msg.id}
                username={msg.role === 'user' ? 'You' : 'AI'}
                timelineAvatar={msg.role === 'user' ? 'user' : 'compute'}
                event={msg.role === 'user' ? 'asked' : 'responded'}
              >
                <EuiText size="s">
                  <p
                    className={css`
                      white-space: pre-wrap;
                    `}
                  >
                    {msg.content}
                  </p>
                </EuiText>
                {msg.pipeline && (
                  <>
                    <EuiSpacer size="xs" />
                    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                      <EuiFlexItem grow={false}>
                        <EuiButtonEmpty
                          size="xs"
                          iconType={msg.applied ? 'checkInCircleFilled' : 'check'}
                          onClick={() => handleApply(msg.id, msg.pipeline!)}
                          disabled={msg.applied}
                          data-test-subj="chatApplyPipelineButton"
                        >
                          {msg.applied
                            ? i18n.AI_CHAT_PANEL.appliedLabel
                            : i18n.AI_CHAT_PANEL.applyButton}
                        </EuiButtonEmpty>
                      </EuiFlexItem>
                      {msg.validationResults && (
                        <EuiFlexItem grow={false}>
                          <EuiBadge
                            color={
                              msg.validationResults.success_rate === 100 ? 'success' : 'warning'
                            }
                          >
                            {i18n.AI_CHAT_PANEL.validationSuccess(
                              msg.validationResults.success_rate,
                              msg.validationResults.total_samples
                            )}
                          </EuiBadge>
                        </EuiFlexItem>
                      )}
                    </EuiFlexGroup>
                  </>
                )}
              </EuiComment>
            ))}
          </EuiCommentList>
        ) : (
          <EuiFlexGroup
            justifyContent="center"
            alignItems="center"
            direction="column"
            gutterSize="s"
            className={css`
              height: 100%;
              opacity: 0.5;
            `}
          >
            <EuiFlexItem grow={false}>
              <EuiText size="s" textAlign="center">
                {i18n.AI_CHAT_PANEL.placeholder}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
        <div ref={messagesEndRef} />
      </EuiFlexItem>

      <EuiHorizontalRule margin="s" />

      <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
        <EuiFlexItem>
          <EuiFieldText
            compressed
            fullWidth
            placeholder={i18n.AI_CHAT_PANEL.placeholder}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!activeConnectorId || chatEditPipelineMutation.isLoading}
            data-test-subj="chatPipelineInput"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {chatEditPipelineMutation.isLoading ? (
            <EuiLoadingSpinner size="m" />
          ) : (
            <EuiButtonIcon
              iconType="kqlFunction"
              aria-label={i18n.AI_CHAT_PANEL.sendButton}
              onClick={handleSend}
              disabled={!inputValue.trim() || !activeConnectorId}
              data-test-subj="chatPipelineSendButton"
            />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

PipelineChatPanel.displayName = 'PipelineChatPanel';
