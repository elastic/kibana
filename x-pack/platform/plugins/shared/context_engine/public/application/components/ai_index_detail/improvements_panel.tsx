/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSkeletonText,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import {
  DEFAULT_IMPROVEMENTS_PAGE_SIZE,
  MAX_IMPROVEMENTS_PAGE_SIZE,
} from '../../../../common/constants';
import type { GetAiIndexResponse } from '../../../../common/http_api/ai_indices';
import { IMPROVEMENT_STATUSES } from '../../../../common/http_api/improvements';
import { useFeedbackLoopEnabled } from '../../hooks/use_feedback_loop_enabled';
import { useImprovements } from '../../hooks/use_improvements';
import { useApproveImprovement, useRejectImprovement } from '../../hooks/use_resolve_improvement';
import { ImprovementRow } from './improvement_row';
import { SignalsErrorPrompt } from './signals_error_prompt';

interface ImprovementsPanelProps {
  isLoading: boolean;
  aiIndex: GetAiIndexResponse | undefined;
}

/**
 * The review surface for what the feedback agent proposed. Suggestions awaiting the user are shown
 * by default; the history switch adds the ones already applied or rejected, which is also what the
 * agent sees on its next run.
 */
export const ImprovementsPanel = ({ isLoading, aiIndex }: ImprovementsPanelProps) => {
  const feedbackLoopEnabled = useFeedbackLoopEnabled();
  const [showHistory, setShowHistory] = useState(false);
  const [size, setSize] = useState(DEFAULT_IMPROVEMENTS_PAGE_SIZE);
  const aiIndexId = aiIndex?.id;

  const {
    improvements,
    total,
    isLoading: isLoadingImprovements,
    error,
  } = useImprovements({
    aiIndexId,
    // Omitting the filter asks for the route's default (the open statuses); history asks for all of
    // them, so a resolved suggestion can be traced back to who decided and when.
    status: showHistory ? IMPROVEMENT_STATUSES : undefined,
    size,
    enabled: feedbackLoopEnabled,
  });

  const approve = useApproveImprovement(aiIndexId ?? '');
  const reject = useRejectImprovement(aiIndexId ?? '');
  const isResolving = approve.isLoading || reject.isLoading;

  const resolvingActionFor = (improvementId: string): 'approve' | 'reject' | undefined => {
    if (approve.isLoading && approve.variables === improvementId) {
      return 'approve';
    }
    if (reject.isLoading && reject.variables === improvementId) {
      return 'reject';
    }
    return undefined;
  };

  const loading = isLoading || isLoadingImprovements;
  const hasMore = improvements.length < total;
  const canLoadMore = hasMore && size < MAX_IMPROVEMENTS_PAGE_SIZE;

  // Feedback loop off → nothing ever proposes an improvement; render nothing rather than an
  // empty panel that can never fill.
  if (!feedbackLoopEnabled) {
    return null;
  }

  return (
    <EuiPanel hasBorder paddingSize="l" data-test-subj="contextImprovementsPanel">
      <EuiFlexGroup alignItems="flexStart" gutterSize="m" responsive={false}>
        <EuiFlexItem>
          <EuiTitle size="s">
            <h2>
              {i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.title', {
                defaultMessage: 'Suggested improvements',
              })}
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSwitch
            compressed
            label={i18n.translate(
              'xpack.contextEngine.aiIndexDetail.improvements.showHistorySwitch',
              { defaultMessage: 'Show history' }
            )}
            checked={showHistory}
            onChange={(event) => setShowHistory(event.target.checked)}
            data-test-subj="contextImprovementsHistorySwitch"
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        <p>
          {i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.description', {
            defaultMessage:
              'Changes the analysis agent proposed for this index’s knowledge indicators and automations. Approving one applies it; rejecting one records the decision so it is not proposed again.',
          })}
        </p>
      </EuiText>
      <EuiSpacer size="m" />

      {loading ? (
        <EuiSkeletonText lines={3} data-test-subj="contextImprovementsLoading" />
      ) : error ? (
        <SignalsErrorPrompt />
      ) : improvements.length === 0 ? (
        <EuiEmptyPrompt
          iconType="sparkles"
          titleSize="xs"
          data-test-subj="contextImprovementsEmpty"
          title={
            <h3>
              {showHistory
                ? i18n.translate(
                    'xpack.contextEngine.aiIndexDetail.improvements.emptyHistoryTitle',
                    { defaultMessage: 'No suggestions yet' }
                  )
                : i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.emptyTitle', {
                    defaultMessage: 'Nothing awaiting review',
                  })}
            </h3>
          }
          body={
            <p>
              {showHistory
                ? i18n.translate(
                    'xpack.contextEngine.aiIndexDetail.improvements.emptyHistoryBody',
                    {
                      defaultMessage:
                        'Suggestions appear here after an analysis run. Start one from the Signals panel.',
                    }
                  )
                : i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.emptyBody', {
                    defaultMessage:
                      'Every suggestion has been applied or rejected. Turn on Show history to see them.',
                  })}
            </p>
          }
        />
      ) : (
        <>
          {hasMore && (
            <>
              <EuiText size="xs" color="subdued" data-test-subj="contextImprovementsTruncated">
                <p>
                  {i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.truncated', {
                    defaultMessage: 'Showing {shown} of {total}',
                    values: { shown: improvements.length, total },
                  })}
                </p>
              </EuiText>
              <EuiSpacer size="s" />
            </>
          )}
          <div data-test-subj="contextImprovementsList" role="list">
            {improvements.map((improvement, index) => (
              <div role="listitem" key={improvement.improvement_id}>
                <ImprovementRow
                  improvement={improvement}
                  // One resolution at a time: an approve writes KIs or workflows, and a second
                  // approval landing mid-apply would review a stale list.
                  isActionable={!isResolving}
                  resolvingAction={resolvingActionFor(improvement.improvement_id)}
                  onApprove={() => approve.mutate(improvement.improvement_id)}
                  onReject={() => reject.mutate(improvement.improvement_id)}
                />
                {index < improvements.length - 1 && <EuiSpacer size="s" />}
              </div>
            ))}
          </div>
          {canLoadMore && (
            <>
              <EuiSpacer size="m" />
              <EuiFlexGroup justifyContent="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    size="s"
                    iconType="chevronSingleDown"
                    isLoading={isLoadingImprovements}
                    onClick={() =>
                      setSize((current) =>
                        Math.min(
                          current + DEFAULT_IMPROVEMENTS_PAGE_SIZE,
                          MAX_IMPROVEMENTS_PAGE_SIZE
                        )
                      )
                    }
                    data-test-subj="contextImprovementsLoadMore"
                  >
                    {i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.loadMore', {
                      defaultMessage: 'Load more',
                    })}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
            </>
          )}
        </>
      )}
    </EuiPanel>
  );
};
