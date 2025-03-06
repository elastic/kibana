/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useEffect, useState } from 'react';
import { EuiLoadingSpinner, EuiSpacer, EuiTitle } from '@elastic/eui';
import { MessageText } from '../assistant/message_text';
import { ChatCompleteResponse } from '../assistant/api/chat_complete/post_chat_complete';
import { useFetchAnonymizationFields } from '../assistant/api/anonymization_fields/use_fetch_anonymization_fields';
import { useChatComplete } from '../assistant/api/chat_complete/use_chat_complete';
import * as i18n from './translations';

interface OwnProps {
  alertId: string;
}

type Props = OwnProps;

export const AlertSummary: FunctionComponent<Props> = ({ alertId }) => {
  const { abortStream, isLoading, sendMessage } = useChatComplete();
  const { data: anonymizationFields, isFetched: isFetchedAnonymizationFields } =
    useFetchAnonymizationFields();
  const [chatCompletionResponse, setChatCompletionResponse] = useState<ChatCompleteResponse>({
    response: i18n.NO_SUMMARY_AVAILABLE,
    isError: false,
  });

  useEffect(() => {
    const fetchSummary = async () => {
      const rawResponse = await sendMessage({
        message: `analyze this alert: ${alertId}`,
        replacements: {},
      });
      console.log('rawResponse', rawResponse);
      setChatCompletionResponse(rawResponse);
    };

    if (isFetchedAnonymizationFields) fetchSummary();
    return () => {
      abortStream();
    };
  }, [abortStream, alertId, isFetchedAnonymizationFields, sendMessage]);
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
          index={0}
          contentReferencesVisible={!!chatCompletionResponse.metadata?.contentReferences}
          loading={false}
        />
      )}
    </>
  );
};
