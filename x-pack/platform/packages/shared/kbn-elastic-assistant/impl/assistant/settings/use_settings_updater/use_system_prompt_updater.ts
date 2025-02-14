/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';
import { FindPromptsResponse, PromptResponse, PromptTypeEnum } from '@kbn/elastic-assistant-common';
import { HttpSetup } from '@kbn/core-http-browser';
import { Conversation, useFetchCurrentUserConversations } from '../../../..';
interface Params {
  allPrompts: FindPromptsResponse;
  http: HttpSetup;
  isAssistantEnabled: boolean;
}
export interface SystemPromptSettings extends PromptResponse {
  conversations: Conversation[];
}
export const useSystemPromptUpdater = ({
  allPrompts,
  http,
  isAssistantEnabled,
}: Params): {
  systemPromptSettings: SystemPromptSettings[];
  setSystemPromptSettings: React.Dispatch<React.SetStateAction<SystemPromptSettings[]>>;
} => {
  const [systemPromptSettings, setSystemPromptSettings] = useState<SystemPromptSettings[]>([]);

  const systemPrompts = useMemo(
    () => allPrompts.data.filter((p) => p.promptType === PromptTypeEnum.system),
    [allPrompts.data]
  );

  const filter = useMemo(() => {
    const systemPromptIds = systemPrompts.map((p) => p.id);
    if (!Array.isArray(systemPromptIds) || systemPromptIds.length === 0) {
      return '';
    }

    return systemPromptIds
      .map((value) => `api_config.default_system_prompt_id: "${value}"`)
      .join(' OR ');
  }, [systemPrompts]);

  const { data } = useFetchCurrentUserConversations({
    http,
    isAssistantEnabled: isAssistantEnabled && filter.length > 0,
    filter,
  });
  useEffect(() => {
    if (!Object.keys(data).length) return;

    setSystemPromptSettings((prev) => {
      const updatedSettings = systemPrompts.map((p) => {
        const conversations = Object.values(data).filter(
          (conversation) => conversation.apiConfig?.defaultSystemPromptId === p.id
        );
        return { ...p, conversations };
      });

      // Only update state if there's an actual change
      if (JSON.stringify(prev) !== JSON.stringify(updatedSettings)) {
        return updatedSettings;
      }
      return prev;
    });
  }, [data, systemPrompts]);

  console.log('system prompt data', { systemPromptSettings, filter, data });
  return {
    systemPromptSettings,
    setSystemPromptSettings,
  };
};
