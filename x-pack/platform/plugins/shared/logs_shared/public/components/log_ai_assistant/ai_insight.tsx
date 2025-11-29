/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useState } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { EuiSpacer } from '@elastic/eui';
import { AiInsight } from '@kbn/observability-agent-builder';
import type { OnechatPluginStart } from '@kbn/onechat-plugin/public';
import type { HttpHandler } from '@kbn/core-http-browser';
import { useKibana } from '@kbn/kibana-react-plugin/public';
// import { OBSERVABILITY_AI_INSIGHT_ATTACHMENT_TYPE_ID } from '@kbn/observability-agent-plugin/server/attachments/ai_insight';
import type { LogAIAssistantDocument } from './log_ai_assistant';
import { explainLogMessageButtonLabel, explainLogMessageDescription } from './translations';
import { createCallApi } from '../../services/call_api';

export function LogEntryAgentBuilderAiInsight({
  doc,
  onechat,
}: {
  doc: LogAIAssistantDocument | undefined;
  onechat?: OnechatPluginStart;
}) {
  const { services } = useKibana();
  // const isObservabilityAgentEnabled = getIsObservabilityAgentEnabled(core);

  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState('');
  const [context, setContext] = useState('');

  const [lastUsedConnectorId] = useLocalStorage('agentBuilder.lastUsedConnector', '');

  const httpFetch = services?.http?.fetch as HttpHandler;
  const callApi = createCallApi(httpFetch);

  const fetchAiInsights = async () => {
    setIsLoading(true);
    try {
      const response = await callApi('POST /internal/apm/agent_builder/ai_insight/log', {
        params: {
          body: {
            fields: doc?.fields,
            connectorId: lastUsedConnectorId,
          },
        },
        signal: null,
      });
      setSummary(response?.summary ?? '');
      setContext(response?.context);
    } catch (e) {
      setSummary('');
      setContext('');
    } finally {
      setIsLoading(false);
    }
  };

  const attachments = useMemo(() => {
    // if (!onechat || !isObservabilityAgentEnabled) {
    //   return [];
    // }

    return [
      {
        id: 'log_entry_details_screen_context',
        type: 'screen_context',
        getContent: () => ({
          app: 'discover',
          url: window.location.href,
        }),
      },
      {
        id: 'log_entry_ai_insight',
        // type: OBSERVABILITY_AI_INSIGHT_ATTACHMENT_TYPE_ID,
        type: 'observability.ai_insight',
        getContent: () => ({
          summary,
          context,
        }),
      },
    ];
  }, [summary, context]);
  // }, [error, onechat, isObservabilityAgentEnabled, summary, context]);

  // if (!onechat || !isObservabilityAgentEnabled || !inference) {
  //   return <></>;
  // }

  return (
    <>
      <AiInsight
        title={explainLogMessageButtonLabel}
        description={explainLogMessageDescription}
        content={summary}
        isLoading={isLoading}
        onOpen={fetchAiInsights}
        onStartConversation={() => {
          onechat?.openConversationFlyout({
            attachments,
            sessionTag: 'log-entry-ai-insight',
            newConversation: true,
          });
        }}
      />
      <EuiSpacer size="s" />
    </>
  );
}
