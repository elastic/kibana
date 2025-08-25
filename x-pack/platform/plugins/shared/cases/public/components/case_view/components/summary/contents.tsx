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

export interface CaseSummaryContentsProps {
  title: string;
  onToggle: (isOpen: boolean) => void;
  isOpen: boolean;
  summary?: {
    content?: string;
    generatedAt?: string;
  };
  error: Error | null;
  loading?: boolean;
}

export const CaseSummaryContents: React.FC<CaseSummaryContentsProps> = ({
  title,
  onToggle,
  isOpen,
  summary,
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

  const extraProps = { css: { alignSelf: 'flex-start' } };

  return (
    <EuiPanel hasBorder hasShadow={false}>
      <EuiAccordion
        id="caseSummaryContainer"
        arrowProps={extraProps}
        buttonContent={
          <EuiFlexGroup wrap responsive={false} gutterSize="m" data-test-subj="caseSummaryButton">
            <EuiFlexItem grow={false}>
              <EuiSpacer size="xs" />
              <AssistantIcon size="m" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFlexGroup gutterSize="s" alignItems="center">
                <EuiText css={{ marginTop: 2, marginBottom: 1 }}>
                  <h5>{title}</h5>
                </EuiText>
              </EuiFlexGroup>
              {isOpen && summary && summaryDateTime && (
                <EuiText size="xs" color="subdued">
                  <FormattedMessage
                    id="xpack.cases.caseSummary.description"
                    defaultMessage="Generated on {date} at {time}"
                    values={summaryDateTime}
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
        <EuiSpacer size="m" />
        {summary?.content && (
          <EuiPanel
            hasBorder={false}
            hasShadow={false}
            color="subdued"
            data-test-subj="caseSummaryResponse"
          >
            <EuiMarkdownFormat textSize="s">{summary.content}</EuiMarkdownFormat>
          </EuiPanel>
        )}
        {error && (
          <EuiPanel
            hasBorder={false}
            hasShadow={false}
            color="danger"
            data-test-subj="caseSummaryResponseError"
          >
            <FormattedMessage
              id="xpack.cases.caseSummary.error"
              defaultMessage="Error fetching case summary"
            />
          </EuiPanel>
        )}
      </EuiAccordion>
    </EuiPanel>
  );
};

CaseSummaryContents.displayName = 'CaseSummaryContents';
