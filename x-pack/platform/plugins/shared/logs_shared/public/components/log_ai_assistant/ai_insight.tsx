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
import { useKibanaContextForPlugin } from '../../hooks/use_kibana';
import { getIsObservabilityAgentEnabled } from '@kbn/observability-agent-builder-plugin/server/utils/get_is_obs_agent_enabled';
import { OBSERVABILITY_AI_INSIGHT_ATTACHMENT_TYPE_ID } from '@kbn/observability-agent-builder-plugin/server/attachments/ai_insight';
import type { LogAIAssistantDocument } from './log_ai_assistant';
import { explainLogMessageButtonLabel, explainLogMessageDescription } from './translations';

export function LogEntryAgentBuilderAiInsight({
  doc,
  onechat,
}: {
  doc: LogAIAssistantDocument | undefined;
  onechat?: OnechatPluginStart;
}) {
  const {
    services: { http, core },
  } = useKibanaContextForPlugin();
  // const isObservabilityAgentEnabled = getIsObservabilityAgentEnabled(core);

  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState('');
  const [context, setContext] = useState('');

  const [lastUsedConnectorId] = useLocalStorage('agentBuilder.lastUsedConnector', '');

  const fetchAiInsights = async () => {
    setIsLoading(true);
    try {
      const response = await http.post<{ summary: string; context: string }>(
        '/internal/observability_agent_builder/ai_insights/log',
        {
          body: JSON.stringify({
            fields: doc?.fields,
            connectorId: lastUsedConnectorId,
          }),
        }
      );
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
        type: OBSERVABILITY_AI_INSIGHT_ATTACHMENT_TYPE_ID,
        getContent: () => ({
          summary,
          context,
        }),
      },
    ];
  }, [summary, context]);

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
