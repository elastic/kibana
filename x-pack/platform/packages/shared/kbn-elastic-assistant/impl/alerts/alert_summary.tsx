/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useEffect, useState } from 'react';
import { EuiLoadingSpinner, EuiSpacer, EuiTitle } from '@elastic/eui';
import {
  replaceAnonymizedValuesWithOriginalValues,
  Replacements,
} from '@kbn/elastic-assistant-common';
import { getCombinedMessage } from '../assistant/prompt/helpers';
import type { PromptContext } from '../..';
import { getNewSelectedPromptContext } from '../data_anonymization/get_new_selected_prompt_context';
import { MessageText } from './message_text';
import { useFetchAnonymizationFields } from '../assistant/api/anonymization_fields/use_fetch_anonymization_fields';
import { useChatComplete } from '../assistant/api/chat_complete/use_chat_complete';
import * as i18n from './translations';
import { ChatCompleteResponse } from '../assistant/api/chat_complete/post_chat_complete';

interface OwnProps {
  isReady: boolean;
  promptContext: PromptContext;
}

type Props = OwnProps;
const notActualPromptJustForTesting =
  ' Highlight any host names or user names at the top of your summary.';
const prompt = `Give a brief analysis of the event from the context above and format your output neatly in markdown syntax. Give only key observations in paragraph format. Highlight any host or user names at the top of your summary. ${notActualPromptJustForTesting}`;

export const AlertSummary: FunctionComponent<Props> = ({ isReady, promptContext }) => {
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

    if (isFetchedAnonymizationFields && isReady) fetchContext();
  }, [anonymizationFields, isFetchedAnonymizationFields, isReady, promptContext]);

  useEffect(() => {
    const fetchSummary = async (content: { message: string; replacements: Replacements }) => {
      const rawResponse = await sendMessage(content);
      setChatCompletionResponse({
        ...rawResponse,
        response: replaceAnonymizedValuesWithOriginalValues({
          messageContent: rawResponse.response,
          replacements: content.replacements,
        }),
      });
    };

    if (messageAndReplacements !== null) fetchSummary(messageAndReplacements);
  }, [abortStream, messageAndReplacements, sendMessage]);

  useEffect(() => {
    return () => {
      abortStream();
    };
  }, [abortStream]);
  return (
    <>
      <EuiTitle size={'s'} data-test-subj="knowledge-base-settings">
        <h2>{i18n.AI_SUMMARY}</h2>
      </EuiTitle>
      <EuiSpacer size="xs" />
      {isLoading ? (
        <EuiLoadingSpinner size="m" />
      ) : (
        <MessageText
          content={chatCompletionResponse.response}
          contentReferences={chatCompletionResponse.metadata?.contentReferences}
        />
      )}
    </>
  );
};
