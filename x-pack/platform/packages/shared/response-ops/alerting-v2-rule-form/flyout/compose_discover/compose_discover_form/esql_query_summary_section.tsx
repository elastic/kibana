/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiCodeBlock,
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
  EuiSplitPanel,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { ReactNode } from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

const LONG_QUERY_LINE_THRESHOLD = 8;
const CODE_BLOCK_OVERFLOW_HEIGHT = 120;

const queryBodyPanelStyles = css`
  padding-top: 0;
`;

export interface EsqlQuerySummaryBlock {
  id: string;
  label: string;
  query: string;
  emptyMessage: string;
}

export interface EsqlQuerySummarySectionProps {
  /** Section heading. Defaults to "ES|QL query". */
  title?: string;
  description: string;
  blocks: EsqlQuerySummaryBlock[];
  editButtonLabel: string;
  onEdit: () => void;
  editDisabled?: boolean;
  editTestSubj: string;
  isEmpty?: boolean;
  callout?: ReactNode;
  emptyMessage?: string;
  emptyAction?: {
    label: string;
    onClick: () => void;
    testSubj: string;
    disabled?: boolean;
  };
}

const countLines = (query: string): number => (query.trim() ? query.split('\n').length : 0);

export const EsqlQuerySummarySection: React.FC<EsqlQuerySummarySectionProps> = ({
  title = i18n.translate('xpack.alertingV2.composeDiscover.esqlQuerySummary.title', {
    defaultMessage: 'ES|QL query',
  }),
  description,
  blocks,
  editButtonLabel,
  onEdit,
  editDisabled = false,
  editTestSubj,
  isEmpty = false,
  callout,
  emptyMessage,
  emptyAction,
}) => {
  return (
    <EuiSplitPanel.Outer hasBorder data-test-subj="composeDiscoverEsqlQuerySection">
      <EuiSplitPanel.Inner grow={false} paddingSize="m">
        <EuiTitle size="xs" data-test-subj="composeDiscoverEsqlQuerySectionTitle">
          <h3>{title}</h3>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText size="xs" color="subdued" data-test-subj="composeDiscoverEsqlQuerySectionDescription">
          {description}
        </EuiText>
      </EuiSplitPanel.Inner>

      <EuiSplitPanel.Inner css={queryBodyPanelStyles}>
        {callout && (
          <>
            {callout}
            <EuiSpacer size="m" />
          </>
        )}
        {isEmpty ? (
          <>
            {emptyMessage && (
              <>
                <EuiPanel color="subdued" paddingSize="m">
                  <EuiText size="s" color="subdued">
                    {emptyMessage}
                  </EuiText>
                </EuiPanel>
                {emptyAction && <EuiSpacer size="s" />}
              </>
            )}
            {emptyAction && (
              <>
                <EuiButton
                  iconType="editorCodeBlock"
                  isDisabled={emptyAction.disabled}
                  onClick={emptyAction.onClick}
                  data-test-subj={emptyAction.testSubj}
                >
                  {emptyAction.label}
                </EuiButton>
              </>
            )}
          </>
        ) : (
          <>
            {blocks.map((block, index) => (
              <React.Fragment key={block.id}>
                {index > 0 && <EuiSpacer size="m" />}
                <EuiFormRow label={block.label} fullWidth>
                  {block.query.trim() ? (
                    <EuiCodeBlock
                      language="esql"
                      fontSize="s"
                      paddingSize="m"
                      isCopyable
                      overflowHeight={
                        countLines(block.query) > LONG_QUERY_LINE_THRESHOLD
                          ? CODE_BLOCK_OVERFLOW_HEIGHT
                          : undefined
                      }
                      data-test-subj={`composeDiscoverEsqlQueryBlock-${block.id}`}
                    >
                      {block.query}
                    </EuiCodeBlock>
                  ) : (
                    <EuiPanel color="subdued" paddingSize="s">
                      <EuiText size="s" color="subdued">
                        {block.emptyMessage}
                      </EuiText>
                    </EuiPanel>
                  )}
                </EuiFormRow>
              </React.Fragment>
            ))}
            <EuiSpacer size="m" />
            <EuiButton
              size="s"
              color="text"
              iconType="editorCodeBlock"
              isDisabled={editDisabled}
              onClick={onEdit}
              data-test-subj={editTestSubj}
            >
              {editButtonLabel}
            </EuiButton>
          </>
        )}
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
};
