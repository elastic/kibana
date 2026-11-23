/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n-react';
import type { CaseDeltaSummaryResponse } from '../../../../../common/types/api';
import { describeSource } from './describe_source';
import * as i18n from './translations';

export interface AiSummaryState {
  data: CaseDeltaSummaryResponse | undefined;
  isLoading: boolean;
  isError: boolean;
}

interface AiSummaryButtonProps extends AiSummaryState {
  onSummarize: () => void;
}

/** The header action. It shows only before the analyst asks for a summary. */
export const AiSummaryButton = React.memo<AiSummaryButtonProps>(
  ({ data, isLoading, isError, onSummarize }) =>
    data == null && !isLoading && !isError ? (
      <EuiButton
        size="s"
        iconType="sparkles"
        onClick={onSummarize}
        data-test-subj="case-view-ai-summary-button"
      >
        {i18n.SUMMARIZE_WITH_AI}
      </EuiButton>
    ) : null
);
AiSummaryButton.displayName = 'AiSummaryButton';

interface AiSummaryResultProps extends AiSummaryState {
  onSummarize: () => void;
}

/** Shows the loading state, the error or the summary. Shows nothing before the first request. */
export const AiSummaryResult = React.memo<AiSummaryResultProps>(
  ({ data, isLoading, isError, onSummarize }) => {
    if (isLoading) {
      return (
        <EuiFlexGroup
          alignItems="center"
          gutterSize="s"
          responsive={false}
          data-test-subj="case-view-ai-summary-loading"
        >
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="m" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">{i18n.AI_SUMMARY_LOADING}</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    if (isError) {
      return (
        <EuiCallOut
          announceOnMount
          size="s"
          color="danger"
          iconType="warning"
          title={i18n.AI_SUMMARY_ERROR_TITLE}
          data-test-subj="case-view-ai-summary-error"
        >
          <p>{i18n.AI_SUMMARY_ERROR_BODY}</p>
          <EuiButton size="s" color="danger" onClick={onSummarize}>
            {i18n.TRY_AGAIN}
          </EuiButton>
        </EuiCallOut>
      );
    }

    if (data == null) {
      return null;
    }

    return (
      <EuiPanel
        color="plain"
        hasShadow={false}
        paddingSize="m"
        data-test-subj="case-view-ai-summary"
      >
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type="sparkles" aria-hidden={true} />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s">
              <strong>{i18n.AI_SUMMARY_TITLE}</strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="xs"
              iconType="refresh"
              onClick={onSummarize}
              data-test-subj="case-view-ai-summary-regenerate"
            >
              {i18n.REGENERATE}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiText size="s" data-test-subj="case-view-ai-summary-text">
          {data.summary.length > 0 ? data.summary : i18n.AI_SUMMARY_EMPTY}
        </EuiText>
        {data.sources.length > 0 && (
          <>
            <EuiSpacer size="s" />
            <EuiText size="xs" color="subdued">
              {`${i18n.SOURCES}:`}
            </EuiText>
            <EuiText size="xs" data-test-subj="case-view-ai-summary-sources">
              {data.sources.map(({ index, item }) => (
                <div key={item.id} data-test-subj={`case-view-ai-summary-source-${index}`}>
                  {`[${index}] ${describeSource(item)} · `}
                  <FormattedRelative value={new Date(item.createdAt)} />
                </div>
              ))}
            </EuiText>
          </>
        )}
        <EuiSpacer size="s" />
        <EuiText size="xs" color="subdued">
          {i18n.AI_SUMMARY_DISCLAIMER}
        </EuiText>
      </EuiPanel>
    );
  }
);
AiSummaryResult.displayName = 'AiSummaryResult';
