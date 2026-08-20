/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { DEFAULT_SIGNALS_PAGE_SIZE, MAX_SIGNALS_PAGE_SIZE } from '../../../../common/constants';
import type { GetAiIndexResponse } from '../../../../common/http_api/ai_indices';
import type { SignalGroup } from '../../../../common/http_api/signals';
import { analyzeAndImprove } from '../../utils/analyze_and_improve';
import { useKibana } from '../../hooks/use_kibana';
import { useSignals } from '../../hooks/use_signals';
import { humanizeTagType, tagDescription } from './signal_format';
import { SignalDetailFlyout } from './signal_detail_flyout';
import { SignalRow } from './signal_row';
import { SignalsErrorPrompt } from './signals_error_prompt';

interface SignalGroupFlyoutProps {
  group: SignalGroup;
  aiIndex: GetAiIndexResponse | undefined;
  onClose: () => void;
}

/**
 * The group "issue" view: what the tag means, and the member signals it contains. Opening a signal
 * stacks the trace-waterfall {@link SignalDetailFlyout} on top. Mirrors the read-only Signals panel
 * states (loading / error / empty / truncated) so behaviour is consistent wherever a group is shown.
 */
export const SignalGroupFlyout = ({ group, aiIndex, onClose }: SignalGroupFlyoutProps) => {
  const flyoutTitleId = useGeneratedHtmlId({ prefix: 'ctxSignalGroupFlyout' });
  const {
    services: { getChatOpener },
  } = useKibana();
  const chatOpener = getChatOpener?.();

  // Load-more pagination: grow the page size on demand up to the server's per-request cap so the
  // member list (and the stacked detail flyout's Prev/Next) can reach signals beyond the first page.
  const [size, setSize] = useState(DEFAULT_SIGNALS_PAGE_SIZE);
  const { signals, total, isLoading, error } = useSignals({ tag: group.tag, size });
  const [flyoutIndex, setFlyoutIndex] = useState<number | null>(null);

  const hasMore = signals.length < total;
  const canLoadMore = hasMore && size < MAX_SIGNALS_PAGE_SIZE;
  const capReached = hasMore && size >= MAX_SIGNALS_PAGE_SIZE;
  const loadMore = () =>
    setSize((current) => Math.min(current + DEFAULT_SIGNALS_PAGE_SIZE, MAX_SIGNALS_PAGE_SIZE));

  return (
    <>
      <EuiFlyout
        onClose={onClose}
        size="m"
        aria-labelledby={flyoutTitleId}
        data-test-subj="contextSignalGroupFlyout"
      >
        <EuiFlyoutHeader hasBorder>
          <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
            <EuiFlexItem>
              <EuiTitle size="m">
                <h2 id={flyoutTitleId}>{humanizeTagType(group.tag)}</h2>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow" data-test-subj="contextSignalGroupFlyoutCount">
                {i18n.translate('xpack.contextEngine.aiIndexDetail.signals.groupCount', {
                  defaultMessage: '{count, plural, one {# signal} other {# signals}}',
                  values: { count: group.count },
                })}
              </EuiBadge>
            </EuiFlexItem>
            {chatOpener && (
              <EuiFlexItem grow={false}>
                <EuiButton
                  size="s"
                  iconType="sparkles"
                  onClick={() =>
                    aiIndex && analyzeAndImprove(getChatOpener, { aiIndex, tag: group.tag })
                  }
                  isDisabled={aiIndex === undefined}
                  data-test-subj="contextSignalGroupAnalyzeButton"
                >
                  {i18n.translate('xpack.contextEngine.aiIndexDetail.signals.analyzeButton', {
                    defaultMessage: 'Analyze & improve',
                  })}
                </EuiButton>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlyoutHeader>

        <EuiFlyoutBody>
          <EuiCallOut
            size="s"
            iconType="inspect"
            title={tagDescription(group.tag)}
            data-test-subj="contextSignalGroupSummary"
          />
          <EuiSpacer size="m" />

          <div data-test-subj="contextSignalsGroupDetail">
            {isLoading ? (
              <EuiSkeletonText lines={3} data-test-subj="contextSignalsGroupLoading" />
            ) : error ? (
              <SignalsErrorPrompt />
            ) : signals.length === 0 ? (
              <EuiText size="s" color="subdued" data-test-subj="contextSignalsGroupEmpty">
                <p>
                  {i18n.translate('xpack.contextEngine.aiIndexDetail.signals.groupEmpty', {
                    defaultMessage: 'No signals found for this group.',
                  })}
                </p>
              </EuiText>
            ) : (
              <>
                {hasMore && (
                  <>
                    <EuiText
                      size="xs"
                      color="subdued"
                      data-test-subj="contextSignalsGroupTruncated"
                    >
                      <p>
                        {i18n.translate('xpack.contextEngine.aiIndexDetail.signals.truncated', {
                          defaultMessage: 'Showing {shown} of {total}',
                          values: { shown: signals.length, total },
                        })}
                      </p>
                    </EuiText>
                    <EuiSpacer size="s" />
                  </>
                )}
                <div role="list">
                  {signals.map((signal, signalIndex) => (
                    <div role="listitem" key={signal.signal_id}>
                      <SignalRow
                        signal={signal}
                        onViewDetails={() => setFlyoutIndex(signalIndex)}
                      />
                      {signalIndex < signals.length - 1 && <EuiSpacer size="s" />}
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
                          isLoading={isLoading}
                          onClick={loadMore}
                          data-test-subj="contextSignalsGroupLoadMore"
                        >
                          {i18n.translate('xpack.contextEngine.aiIndexDetail.signals.loadMore', {
                            defaultMessage: 'Load more',
                          })}
                        </EuiButtonEmpty>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </>
                )}
                {capReached && (
                  <>
                    <EuiSpacer size="s" />
                    <EuiText
                      size="xs"
                      color="subdued"
                      textAlign="center"
                      data-test-subj="contextSignalsGroupCapReached"
                    >
                      <p>
                        {i18n.translate('xpack.contextEngine.aiIndexDetail.signals.capReached', {
                          defaultMessage:
                            'Showing the first {max} signals. Narrow the time range to see the rest.',
                          values: { max: MAX_SIGNALS_PAGE_SIZE },
                        })}
                      </p>
                    </EuiText>
                  </>
                )}
              </>
            )}
          </div>
        </EuiFlyoutBody>
      </EuiFlyout>

      {flyoutIndex !== null && signals[flyoutIndex] && (
        <SignalDetailFlyout
          signals={signals}
          total={total}
          index={flyoutIndex}
          onNavigate={setFlyoutIndex}
          onClose={() => setFlyoutIndex(null)}
        />
      )}
    </>
  );
};
