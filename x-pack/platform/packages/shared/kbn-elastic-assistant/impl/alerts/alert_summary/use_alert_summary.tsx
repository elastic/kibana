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
import { useFetchAlertSummary } from './use_fetch_alert_summary';
import { useBulkUpdateAlertSummary } from './use_bulk_update_alert_summary';
import { getNewSelectedPromptContext } from '../../data_anonymization/get_new_selected_prompt_context';
import { getCombinedMessage } from '../../assistant/prompt/helpers';
import type { PromptContext } from '../../..';
import * as i18n from '../translations';

interface Props {
  alertId: string;
  defaultConnectorId: string;
  isContextReady: boolean;
  promptContext: PromptContext;
  showAnonymizedValues: boolean;
}
const notActualPromptJustForTesting =
  'Highlight any host names or user names at the top of your summary.';
const prompt = `Give a brief analysis of the event from the context above and format your output neatly in markdown syntax. Give only key observations in paragraph format. ${notActualPromptJustForTesting}`;

export const useAlertSummary = ({
  alertId,
  defaultConnectorId,
  isContextReady,
  promptContext,
  showAnonymizedValues,
}: Props) => {
  const { abortStream, isLoading, sendMessage } = useChatComplete({
    connectorId: defaultConnectorId,
  });
  const { data: anonymizationFields, isFetched: isFetchedAnonymizationFields } =
    useFetchAnonymizationFields();
  const [alertSummary, setAlertSummary] = useState<string>(i18n.NO_SUMMARY_AVAILABLE);
  const [messageAndReplacements, setMessageAndReplacements] = useState<{
    message: string;
    replacements: Replacements;
  } | null>(null);
  // indicates that an alert summary exists or is being created/fetched
  const [hasAlertSummary, setHasAlertSummary] = useState<boolean>(false);
  const { data: fetchedAlertSummary } = useFetchAlertSummary({
    alertId,
  });
  const { bulkUpdate } = useBulkUpdateAlertSummary();

  useEffect(() => {
    if (fetchedAlertSummary.data.length > 0) {
      setHasAlertSummary(true);
      setAlertSummary(
        showAnonymizedValues
          ? fetchedAlertSummary.data[0].summary
          : replaceAnonymizedValuesWithOriginalValues({
              messageContent: fetchedAlertSummary.data[0].summary,
              replacements: fetchedAlertSummary.data[0].replacements,
            })
      );
    }
  }, [fetchedAlertSummary, showAnonymizedValues]);

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
      setHasAlertSummary(true);
      const rawResponse = await sendMessage(content);
      setAlertSummary(
        showAnonymizedValues
          ? rawResponse.response
          : replaceAnonymizedValuesWithOriginalValues({
              messageContent: rawResponse.response,
              replacements: content.replacements,
            })
      );

      if (!rawResponse.isError) {
        if (fetchedAlertSummary.data.length > 0) {
          await bulkUpdate({
            alertSummary: {
              update: [
                {
                  id: fetchedAlertSummary.data[0].id,
                  summary: rawResponse.response,
                  replacements: content.replacements,
                },
              ],
            },
          });
        } else {
          await bulkUpdate({
            alertSummary: {
              create: [
                {
                  alertId,
                  summary: rawResponse.response,
                  replacements: content.replacements,
                },
              ],
            },
          });
        }
      }
    };

    if (messageAndReplacements !== null) fetchSummary(messageAndReplacements);
  }, [
    alertId,
    bulkUpdate,
    fetchedAlertSummary.data,
    messageAndReplacements,
    sendMessage,
    showAnonymizedValues,
  ]);

  useEffect(() => {
    return () => {
      abortStream();
    };
  }, [abortStream]);
  return {
    alertSummary,
    hasAlertSummary,
    fetchAISummary,
    isLoading,
    messageAndReplacements,
  };
};
