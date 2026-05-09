/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import type { Capabilities, HttpStart } from '@kbn/core/public';
import {
  API_VERSIONS,
  ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_FIND,
} from '@kbn/elastic-assistant-common';
import type { AgentBuilderAnnouncementVariant } from '@kbn/agent-builder-browser';

const OBSERVABILITY_CONVERSATIONS_ROUTE = '/internal/observability_ai_assistant/conversations';

interface ObservabilityConversationsResponse {
  conversations: unknown[];
}

export function computeAnnouncementVariant(
  hasUsedAiAssistant: boolean,
  canRevertToAssistant: boolean
): AgentBuilderAnnouncementVariant {
  if (!hasUsedAiAssistant) {
    return '1a';
  }
  return canRevertToAssistant ? '1b' : '2a';
}

async function checkObservabilityAssistantUsage(http: HttpStart): Promise<boolean> {
  try {
    const res = await http.fetch<ObservabilityConversationsResponse>(
      OBSERVABILITY_CONVERSATIONS_ROUTE,
      {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      }
    );
    return Array.isArray(res.conversations) && res.conversations.length > 0;
  } catch {
    return false;
  }
}

async function checkSecurityAssistantUsage(http: HttpStart): Promise<boolean> {
  try {
    const res = await http.fetch<{ total: number }>(ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_FIND, {
      method: 'GET',
      version: API_VERSIONS.public.v1,
      query: {
        page: 1,
        per_page: 1,
        is_owner: true,
      },
    });
    return typeof res.total === 'number' && res.total > 0;
  } catch {
    return false;
  }
}

export interface UseAiAssistantPriorUsageResult {
  hasUsedAiAssistant: boolean;
  isReady: boolean;
}

export function useAiAssistantPriorUsage(
  http: HttpStart,
  capabilities: Capabilities
): UseAiAssistantPriorUsageResult {
  const [hasUsedAiAssistant, setHasUsedAiAssistant] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const checkObs = capabilities.observabilityAIAssistant?.show === true;
  const checkSec = capabilities.securitySolutionAssistant?.['ai-assistant'] === true;

  useEffect(() => {
    let cancelled = false;
    setIsReady(false);

    if (!checkObs && !checkSec) {
      setHasUsedAiAssistant(false);
      setIsReady(true);
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      const results = await Promise.all([
        checkObs ? checkObservabilityAssistantUsage(http) : Promise.resolve(false),
        checkSec ? checkSecurityAssistantUsage(http) : Promise.resolve(false),
      ]);
      if (!cancelled) {
        setHasUsedAiAssistant(results.some(Boolean));
        setIsReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [http, checkObs, checkSec]);

  return { hasUsedAiAssistant, isReady };
}
