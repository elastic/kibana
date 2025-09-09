/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiMarkdownFormat,
} from '@elastic/eui';
import React, { useMemo } from 'react';
import { AssistantIcon } from '@kbn/ai-assistant-icon';
import moment from 'moment';
import { FormattedMessage } from '@kbn/i18n-react';

export interface AISummaryProps {
  title: string;
  summary?: {
    content: string;
    generatedAt: string;
  };
  isOpen: boolean;
  onToggle: (isOpen: boolean) => void;
  error: Error | null;
  loading?: boolean;
}

const accoridonProps = { css: { alignSelf: 'flex-start' } };
const textProps = { css: { marginTop: 2, marginBottom: 1 } };

export const AISummary: React.FC<AISummaryProps> = ({
  title,
  summary,
  isOpen,
  onToggle,
  error,
  loading,
}) => {
  const summaryDateTime = useMemo(() => {
    if (!summary) return;

    return {
      date: moment(summary.generatedAt).format('MMM DD, yyyy'),
      time: moment(summary.generatedAt).format('HH:mm'),
    };
  }, [summary]);

  return (
    <EuiPanel hasBorder hasShadow={false}>
      <EuiAccordion
        id="aiSummaryContainer"
        arrowProps={accoridonProps}
        buttonContent={
          <EuiFlexGroup wrap responsive={false} gutterSize="m" data-test-subj="aiSummaryButton">
            <EuiFlexItem grow={false}>
              <EuiSpacer size="xs" />
              <AssistantIcon size="m" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFlexGroup gutterSize="s" alignItems="center">
                <EuiText {...textProps}>
                  <h5>{title}</h5>
                </EuiText>
              </EuiFlexGroup>
              {isOpen && summary && summaryDateTime && (
                <EuiText size="xs" color="subdued">
                  <FormattedMessage
                    id="xpack.aiSummary.description"
                    defaultMessage="Generated on {date} at {time}"
                    values={{
                      date: summaryDateTime.date,
                      time: summaryDateTime.time,
                    }}
                  />
                </EuiText>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        isLoading={loading}
        isDisabled={loading}
        onToggle={onToggle}
      >
        {summary && (
          <>
            <EuiSpacer size="m" />
            <EuiPanel
              hasBorder={false}
              hasShadow={false}
              color="subdued"
              data-test-subj="aiSummaryResponse"
            >
              <EuiMarkdownFormat textSize="s">{summary.content}</EuiMarkdownFormat>
            </EuiPanel>
          </>
        )}
        {error && (
          <>
            <EuiSpacer size="m" />
            <EuiPanel
              hasBorder={false}
              hasShadow={false}
              color="danger"
              data-test-subj="aiSummaryResponseError"
            >
              <FormattedMessage
                id="xpack.aiSummary.error"
                defaultMessage="Error fetching AI summary"
              />
            </EuiPanel>
          </>
        )}
      </EuiAccordion>
    </EuiPanel>
  );
};

AISummary.displayName = 'AISummary';
