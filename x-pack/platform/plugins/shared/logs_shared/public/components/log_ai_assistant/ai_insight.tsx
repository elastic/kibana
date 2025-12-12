/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useState } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { AiInsight } from '@kbn/ai-insights';
import type { OnechatPluginStart } from '@kbn/onechat-plugin/public';
import { useKibanaContextForPlugin } from '../../hooks/use_kibana';
import type { LogAIAssistantDocument } from './log_ai_assistant';
import { explainLogMessageButtonLabel, explainLogMessageDescription } from './translations';

// cannot import from observability-agent-builder-plugin because it is a private plugin
// Illegal import statement: "@kbn/logs-shared-plugin" (platform) is importing "@kbn/observability-agent-builder-plugin" (observability/private).
const OBSERVABILITY_AI_INSIGHT_ATTACHMENT_TYPE_ID = 'observability.ai_insight';
const OBSERVABILITY_LOG_ATTACHMENT_TYPE_ID = 'observability.log';

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
  const { index, id } = useMemo(() => {
    return {
      index: doc?.fields.find((field) => field.field === '_index')?.value[0],
      id: doc?.fields.find((field) => field.field === '_id')?.value[0],
    };
  }, [doc]);

  const fetchAiInsights = async () => {
    setIsLoading(true);
    try {
      const response = await http.post<{ summary: string; context: string }>(
        '/internal/observability_agent_builder/ai_insights/log',
        {
          body: JSON.stringify({
            index,
            id,
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
        type: 'screen_context',
        data: {
          app: 'discover',
          url: window.location.href,
        },
        hidden: true,
      },
      {
        type: OBSERVABILITY_AI_INSIGHT_ATTACHMENT_TYPE_ID,
        data: {
          summary,
          context,
        },
      },
      {
        type: OBSERVABILITY_LOG_ATTACHMENT_TYPE_ID,
        data: {
          index,
          id,
        },
      },
    ];
  }, [summary, context, index, id]);

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
            newConversation: true,
          });
        }}
      />
      <EuiSpacer size="s" />
    </>
  );
}
