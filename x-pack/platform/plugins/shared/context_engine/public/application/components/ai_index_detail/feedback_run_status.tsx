/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiText,
} from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { AiIndexFeedbackRun } from '../../../../common/http_api/ai_indices';
import { isFeedbackRunActive } from '../../../../common/http_api/ai_indices';

interface FeedbackRunStatusProps {
  run: AiIndexFeedbackRun | undefined;
  /** Absent when Agent Builder is unavailable, which leaves nothing to open the conversation in. */
  onOpenConversation?: (conversationId: string) => void;
}

/**
 * What the analysis is doing, and a way into the conversation it is doing it in.
 *
 * A run marks itself finished once it records what it proposed, so a run that errored or timed out
 * leaves its marker behind. Rather than showing it as running forever, one that has gone quiet for
 * longer than the analysis step's own timeout is reported as having stopped without finishing —
 * the conversation is still there to read, which is usually where the reason is.
 */
export const FeedbackRunStatus = ({ run, onOpenConversation }: FeedbackRunStatusProps) => {
  if (!run) {
    return null;
  }

  const isActive = isFeedbackRunActive(run);
  const startedAt = new Date(run.started_at);

  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="s"
      responsive={false}
      data-test-subj="contextFeedbackRunStatus"
    >
      {isActive && (
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="s" />
        </EuiFlexItem>
      )}

      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued">
          <p data-test-subj="contextFeedbackRunStatusText">
            {isActive ? (
              i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.run.active', {
                defaultMessage: 'Analyzing…',
              })
            ) : run.finished_at ? (
              <>
                {i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.run.finished', {
                  defaultMessage:
                    'Last analysis proposed {count, plural, =0 {no changes} one {# change} other {# changes}}',
                  values: { count: run.recorded ?? 0 },
                })}{' '}
                <FormattedRelative value={new Date(run.finished_at)} />
              </>
            ) : (
              <>
                {i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.run.abandoned', {
                  defaultMessage: 'An analysis started',
                })}{' '}
                <FormattedRelative value={startedAt} />{' '}
                {i18n.translate(
                  'xpack.contextEngine.aiIndexDetail.improvements.run.abandonedSuffix',
                  { defaultMessage: 'and stopped without finishing' }
                )}
              </>
            )}
          </p>
        </EuiText>
      </EuiFlexItem>

      {onOpenConversation && (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="xs"
            flush="both"
            iconType="discuss"
            onClick={() => onOpenConversation(run.conversation_id)}
            data-test-subj="contextFeedbackRunOpenConversationButton"
          >
            {isActive
              ? i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.run.watchButton', {
                  defaultMessage: 'Watch it work',
                })
              : i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.run.openButton', {
                  defaultMessage: 'Open the conversation',
                })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
