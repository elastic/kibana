/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  replaceAnonymizedValuesWithOriginalValues,
  Replacements,
} from '@kbn/elastic-assistant-common';
import { useChatComplete } from '../../assistant/api/chat_complete/use_chat_complete';
import { useFetchAnonymizationFields } from '../../assistant/api/anonymization_fields/use_fetch_anonymization_fields';
import { ChatCompleteResponse } from '../../assistant/api/chat_complete/post_chat_complete';
import { useFetchAlertSummary } from './use_fetch_alert_summary';
import { useBulkUpdateAlertSummary } from './use_bulk_update_alert_summary';
import { getNewSelectedPromptContext } from '../../data_anonymization/get_new_selected_prompt_context';
import { getCombinedMessage } from '../../assistant/prompt/helpers';
import type { PromptContext } from '../../..';
import * as i18n from '../translations';

interface Props {
  alertId: string;
  isContextReady: boolean;
  promptContext: PromptContext;
}
const notActualPromptJustForTesting =
  'Highlight any host names or user names at the top of your summary.';
const prompt = `Give a brief analysis of the event from the context above and format your output neatly in markdown syntax. Give only key observations in paragraph format. ${notActualPromptJustForTesting}`;

export const useAlertSummary = ({ alertId, isContextReady, promptContext }: Props) => {
  const { abortStream, isLoading, sendMessage } = useChatComplete();
  const { data: anonymizationFields, isFetched: isFetchedAnonymizationFields } =
    useFetchAnonymizationFields();
  const [chatCompletionResponse, setChatCompletionResponse] = useState<ChatCompleteResponse>({
    response: i18n.NO_SUMMARY_AVAILABLE,
    isError: false,
  });
  const [messageAndReplacements, setMessageAndReplacements] = useState<{
    message: string;
    replacements: Replacements;
  } | null>(null);
  const [didFetch, setDidFetch] = useState<boolean>(false);
  const { data: alertSummary, isFetched: isFetchedAlertSummary } = useFetchAlertSummary({
    alertId,
  });
  const { bulkUpdate, isLoading: isUpdatingAlertSummary } = useBulkUpdateAlertSummary();

  useEffect(() => {
    console.log('alertSummary', alertSummary);
  }, [alertSummary]);

  useEffect(() => {
    const fetchContext = async () => {
      const newSelectedPromptContext = await getNewSelectedPromptContext({
        anonymizationFields,
        promptContext,
      });
      const selectedPromptContexts = {
        [promptContext.id]: newSelectedPromptContext,
      };

      const userMessage = getCombinedMessage({
        currentReplacements: {},
        promptText: prompt,
        selectedPromptContexts,
      });
      const baseReplacements: Replacements = userMessage.replacements ?? {};

      const selectedPromptContextsReplacements = Object.values(
        selectedPromptContexts
      ).reduce<Replacements>((acc, context) => ({ ...acc, ...context.replacements }), {});

      const replacements: Replacements = {
        ...baseReplacements,
        ...selectedPromptContextsReplacements,
      };
      setMessageAndReplacements({ message: userMessage.content ?? '', replacements });
    };

    if (isFetchedAnonymizationFields && isContextReady) fetchContext();
  }, [anonymizationFields, isFetchedAnonymizationFields, isContextReady, promptContext]);

  const fetchAISummary = useCallback(() => {
    const fetchSummary = async (content: { message: string; replacements: Replacements }) => {
      setDidFetch(true);
      const rawResponse = await sendMessage(content);
      setChatCompletionResponse({
        ...rawResponse,
        response: replaceAnonymizedValuesWithOriginalValues({
          messageContent: rawResponse.response,
          replacements: content.replacements,
        }),
      });
      const bulkResponse = await bulkUpdate({
        alertSummary: {
          create: [
            {
              alertId,
              summary: rawResponse.response,
            },
          ],
        },
      });
      console.log('bulkResponse', bulkResponse);
    };

    if (messageAndReplacements !== null) fetchSummary(messageAndReplacements);
  }, [alertId, bulkUpdate, messageAndReplacements, sendMessage]);

  useEffect(() => {
    return () => {
      abortStream();
    };
  }, [abortStream]);
  return {
    chatCompletionResponse,
    didFetch,
    fetchAISummary,
    isLoading,
    messageAndReplacements,
  };
};
