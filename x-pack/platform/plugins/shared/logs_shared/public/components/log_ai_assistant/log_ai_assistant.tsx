/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import dedent from 'dedent';
import { EuiFlexGroup, EuiFlexItem, EuiButton } from '@elastic/eui';
import { type LogDocumentOverview, getMessageFieldWithFallbacks } from '@kbn/discover-utils';
import type {
  Message,
  ObservabilityAIAssistantPublicStart,
} from '@kbn/observability-ai-assistant-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { OnechatPluginStart } from '@kbn/onechat-plugin/public';
import type { LogEntryField } from '../../../common';
import {
  explainLogMessageTitle,
  similarLogMessagesTitle,
  openConversationButtonLabel,
} from './translations';

interface LogAIAssistantServices {
  onechat?: OnechatPluginStart;
}

export interface LogAIAssistantDocument {
  fields: LogEntryField[];
}

export interface LogAIAssistantProps {
  observabilityAIAssistant: ObservabilityAIAssistantPublicStart;
  doc: LogAIAssistantDocument | undefined;
}

export const LogAIAssistant = ({
  doc,
  observabilityAIAssistant: {
    ObservabilityAIAssistantContextualInsight,
    getContextualInsightMessages,
  },
}: LogAIAssistantProps) => {
  const { services } = useKibana<LogAIAssistantServices>();
  const explainLogMessageMessages = useMemo<Message[] | undefined>(() => {
    if (!doc) {
      return undefined;
    }

    const message = getMessageFieldWithFallbacks(doc as unknown as LogDocumentOverview);

    if (!message) {
      return undefined;
    }

    return getContextualInsightMessages({
      message:
        'Can you explain what this log message means? Where it could be coming from, whether it is expected and whether it is an issue.',
      instructions: JSON.stringify({
        logEntry: {
          fields: doc.fields,
        },
      }),
    });
  }, [doc, getContextualInsightMessages]);

  const similarLogMessageMessages = useMemo<Message[] | undefined>(() => {
    if (!doc) {
      return undefined;
    }

    const message = doc.fields.find((field) => field.field === 'message')?.value[0];

    if (!message) {
      return undefined;
    }

    return getContextualInsightMessages({
      message: `I'm looking at a log entry. Can you construct a Kibana KQL query that I can enter in the search bar that gives me similar log entries, based on the message field?`,
      instructions: JSON.stringify({
        message,
      }),
    });
  }, [getContextualInsightMessages, doc]);

  const hasAtLeastOnePrompt = Boolean(explainLogMessageMessages || similarLogMessageMessages);

  return hasAtLeastOnePrompt ? (
    <EuiFlexGroup direction="column" gutterSize="m">
      {ObservabilityAIAssistantContextualInsight && explainLogMessageMessages ? (
        <EuiFlexItem grow={false}>
          <ObservabilityAIAssistantContextualInsight
            title={explainLogMessageTitle}
            messages={explainLogMessageMessages}
            dataTestSubj="obsAiAssistantInsightButtonExplainLogMessage"
          />
        </EuiFlexItem>
      ) : null}
      {ObservabilityAIAssistantContextualInsight && similarLogMessageMessages ? (
        <EuiFlexItem grow={false}>
          <ObservabilityAIAssistantContextualInsight
            title={similarLogMessagesTitle}
            messages={similarLogMessageMessages}
            dataTestSubj="obsAiAssistantInsightButtonSimilarLogMessage"
            showElasticLlmCallout={false}
          />
        </EuiFlexItem>
      ) : null}
      <EuiFlexItem grow={false}>
        <EuiButton
          color="primary"
          onClick={() => {
            if (!services.onechat) {
              return;
            }
            services.onechat.openConversationFlyout({
              newConversation: true,
              agentId: 'observability.agent',
              initialMessage:
                'Explain this log message: what it means, where it is from, whether it is expected, and if it is an issue.',
              attachments: [
                {
                  id: `log-entry-${Date.now()}`,
                  type: 'observability.log_entry',
                  getContent: () => {
                    return {
                      content: JSON.stringify({
                        logEntry: {
                          fields: doc?.fields,
                        },
                      }),
                    };
                  },
                },
                {
                  id: `instructions-${Date.now()}`,
                  type: 'text',
                  getContent: () => ({
                    content: dedent(`
                <contextual_insight_instructions>
                You are assisting an SRE who is viewing a log entry in the Kibana Logs UI.
                Using the provided data produce a concise, action-oriented response.
                  
                - Only call tools if the attachments do not contain the necessary data to analyze the log message.
                - Prefer using attachment data if possible and only call tools to fetch missing context when required.
                </contextual_insight_instructions>
              `),
                  }),
                },
              ],
            });
          }}
          disabled={!services.onechat}
          data-test-subj="logAiAssistantOpenConversationButton"
        >
          {openConversationButtonLabel}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  ) : null;
};

// eslint-disable-next-line import/no-default-export
export default LogAIAssistant;
