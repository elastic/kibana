/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useEffect, useState } from 'react';
import { EuiLoadingSpinner, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
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
  const [aiSummary, setAiSummary] = useState<string>('');

  useEffect(() => {
    const fetchSummary = async () => {
      const rawResponse = await sendMessage({
        message: `analyze this alert: ${alertId}`,
        replacements: {},
      });
      console.log('rawResponse', rawResponse);
      setAiSummary(rawResponse.response || i18n.NO_SUMMARY_AVAILABLE);
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
      {isLoading ? <EuiLoadingSpinner size="m" /> : <EuiText size={'s'}>{aiSummary}</EuiText>}
    </>
  );
};
