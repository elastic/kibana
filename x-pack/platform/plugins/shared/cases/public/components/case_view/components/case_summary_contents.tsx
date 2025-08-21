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
  useEuiTheme,
  EuiMarkdownFormat,
} from '@elastic/eui';
import React from 'react';
import { AssistantIcon } from '@kbn/ai-assistant-icon';
import moment from 'moment';
import { FormattedMessage } from '@kbn/i18n-react';

export interface CaseSummaryContentsProps {
  title: string;
  onToggle: (isOpen: boolean) => void;
  isOpen: boolean;
  summary: string;
  summaryGeneratedAt: string;
  error: Error | null;
  loading?: boolean;
}

export const CaseSummaryContents: React.FC<CaseSummaryContentsProps> = ({
  title,
  onToggle,
  isOpen,
  summary,
  summaryGeneratedAt,
  error,
  loading,
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiPanel hasBorder hasShadow={false}>
      <EuiAccordion
        id="caseSummaryContainer"
        arrowProps={{ css: { alignSelf: 'flex-start' } }}
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
              {isOpen && (
                <EuiText size="xs" css={{ color: euiTheme.colors.textSubdued }}>
                  <FormattedMessage
                    id="xpack.cases.caseSummary.description"
                    defaultMessage="Generated on {date} at {time}"
                    values={{
                      date: moment(summaryGeneratedAt).format('MMM DD, yyyy'),
                      time: moment(summaryGeneratedAt).format('hh:mm'),
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
        <EuiSpacer size="m" />
        {!error && (
          <EuiPanel
            hasBorder={false}
            hasShadow={false}
            color="subdued"
            data-test-subj="caseSummaryResponse"
          >
            <EuiMarkdownFormat textSize="s">{summary}</EuiMarkdownFormat>
          </EuiPanel>
        )}
      </EuiAccordion>
    </EuiPanel>
  );
};

CaseSummaryContents.displayName = 'CaseSummaryContents';
