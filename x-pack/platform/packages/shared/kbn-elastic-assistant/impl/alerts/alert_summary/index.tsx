/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { AssistantIcon } from '@kbn/ai-assistant-icon';
import { useAlertSummary } from './use_alert_summary';
import type { PromptContext } from '../../..';
import { MessageText } from '../message_text';
import * as i18n from '../translations';

interface Props {
  alertId: string;
  isContextReady: boolean;
  promptContext: PromptContext;
}

export const AlertSummary: FunctionComponent<Props> = ({
  alertId,
  isContextReady,
  promptContext,
}) => {
  const { chatCompletionResponse, didFetch, fetchAISummary, isLoading, messageAndReplacements } =
    useAlertSummary({ alertId, isContextReady, promptContext });
  return (
    <>
      <EuiTitle size={'s'}>
        <h2>{i18n.AI_SUMMARY}</h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      {didFetch ? (
        isLoading ? (
          <>
            <EuiText
              color="subdued"
              css={css`
                font-style: italic;
              `}
              size="s"
            >
              {i18n.GENERATING}
            </EuiText>
            <EuiSkeletonText lines={3} size="s" />
          </>
        ) : (
          <MessageText
            content={chatCompletionResponse.response}
            contentReferences={chatCompletionResponse.metadata?.contentReferences}
          />
        )
      ) : (
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={fetchAISummary}
              color="primary"
              size="m"
              data-test-subj="generateInsights"
              isLoading={messageAndReplacements == null}
            >
              <EuiFlexGroup gutterSize="s" alignItems="center">
                <EuiFlexItem grow={false}>
                  <AssistantIcon size="m" />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>{i18n.GENERATE}</EuiFlexItem>
              </EuiFlexGroup>
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </>
  );
};
