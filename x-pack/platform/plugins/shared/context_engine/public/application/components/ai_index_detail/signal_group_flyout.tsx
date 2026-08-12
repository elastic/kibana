/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButton,
  EuiCallOut,
  EuiEmptyPrompt,
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
import type { GetAiIndexResponse } from '../../../../common/http_api/ai_indices';
import type { SignalGroup } from '../../../../common/http_api/signals';
import { analyzeAndImprove } from '../../utils/analyze_and_improve';
import { useKibana } from '../../hooks/use_kibana';
import { useSignals } from '../../hooks/use_signals';
import { humanizeTagType, tagDescription } from './signal_format';
import { SignalDetailFlyout } from './signal_detail_flyout';
import { SignalRow } from './signal_row';

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

  const { signals, total, isLoading, error } = useSignals({ tag: group.tag });
  const [flyoutIndex, setFlyoutIndex] = useState<number | null>(null);

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
              <EuiEmptyPrompt
                color="danger"
                iconType="error"
                titleSize="xs"
                data-test-subj="contextSignalsError"
                title={
                  <h3>
                    {i18n.translate('xpack.contextEngine.aiIndexDetail.signals.errorTitle', {
                      defaultMessage: 'Unable to load signals',
                    })}
                  </h3>
                }
                body={
                  <p>
                    {i18n.translate('xpack.contextEngine.aiIndexDetail.signals.errorBody', {
                      defaultMessage:
                        'Something went wrong while loading signals. Try again later.',
                    })}
                  </p>
                }
              />
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
                {total > signals.length && (
                  <>
                    <EuiText
                      size="xs"
                      color="subdued"
                      data-test-subj="contextSignalsGroupTruncated"
                    >
                      <p>
                        {i18n.translate('xpack.contextEngine.aiIndexDetail.signals.truncated', {
                          defaultMessage: 'Showing first {shown} of {total}',
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
