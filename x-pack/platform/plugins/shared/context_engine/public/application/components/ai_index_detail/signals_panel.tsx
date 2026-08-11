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
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import type { GetAiIndexResponse } from '../../../../common/http_api/ai_indices';
import { analyzeAndImprove } from '../../api/signals';
import { useKibana } from '../../hooks/use_kibana';
import { useSignalGroups } from '../../hooks/use_signal_groups';
import { useSignals } from '../../hooks/use_signals';
import { humanizeTagType } from './signal_format';
import { SignalDetailFlyout } from './signal_detail_flyout';
import { SignalRow } from './signal_row';

interface SignalsPanelProps {
  isLoading: boolean;
  aiIndex: GetAiIndexResponse | undefined;
}

/**
 * Read-only Signals panel. Shows a preaggregated grouped-by-tag list, drill-down into a group's
 * signals (each with a trace waterfall in a flyout), and an "Analyze & improve" button that opens
 * Agent Builder when a chat opener has been registered.
 */
export const SignalsPanel = ({ isLoading, aiIndex }: SignalsPanelProps) => {
  const {
    services: { chatOpener },
  } = useKibana();

  const { groups, isLoading: isLoadingGroups } = useSignalGroups();
  const [selectedTag, setSelectedTag] = useState<string | undefined>();
  const [flyoutIndex, setFlyoutIndex] = useState<number | null>(null);

  const { signals, isLoading: isLoadingSignals } = useSignals({ tag: selectedTag });

  const loading = isLoading || isLoadingGroups;

  const handleAnalyze = () => {
    if (aiIndex) {
      analyzeAndImprove(chatOpener, { aiIndex, signals, tag: selectedTag });
    }
  };

  return (
    <EuiPanel hasBorder paddingSize="l" data-test-subj="contextSignalsPanel">
      <EuiFlexGroup alignItems="flexStart" gutterSize="m" responsive={false}>
        <EuiFlexItem>
          <EuiTitle size="s">
            <h2>
              {i18n.translate('xpack.contextEngine.aiIndexDetail.signals.title', {
                defaultMessage: 'Signals',
              })}
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        {chatOpener && (
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              iconType="sparkles"
              onClick={handleAnalyze}
              isDisabled={aiIndex === undefined}
              data-test-subj="contextSignalsAnalyzeButton"
            >
              {i18n.translate('xpack.contextEngine.aiIndexDetail.signals.analyzeButton', {
                defaultMessage: 'Analyze & improve',
              })}
            </EuiButton>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        <p>
          {i18n.translate('xpack.contextEngine.aiIndexDetail.signals.description', {
            defaultMessage:
              'Signals are observations classified from Agent Builder traces, grouped by tag. Drill into a group to inspect individual signals and their traces.',
          })}
        </p>
      </EuiText>
      <EuiSpacer size="m" />

      {loading ? (
        <EuiSkeletonText lines={3} data-test-subj="contextSignalsLoading" />
      ) : selectedTag === undefined ? (
        groups.length === 0 ? (
          <EuiEmptyPrompt
            iconType="inspect"
            titleSize="xs"
            data-test-subj="contextSignalsEmpty"
            title={
              <h3>
                {i18n.translate('xpack.contextEngine.aiIndexDetail.signals.emptyTitle', {
                  defaultMessage: 'No signals yet',
                })}
              </h3>
            }
            body={
              <p>
                {i18n.translate('xpack.contextEngine.aiIndexDetail.signals.emptyBody', {
                  defaultMessage:
                    'Signals appear here once Agent Builder traces have been processed.',
                })}
              </p>
            }
          />
        ) : (
          <div data-test-subj="contextSignalsGroups">
            {groups.map((group, groupIndex) => (
              <React.Fragment key={group.tag}>
                <EuiPanel
                  hasBorder
                  paddingSize="m"
                  data-test-subj="contextSignalGroupRow"
                  onClick={() => {
                    setSelectedTag(group.tag);
                    setFlyoutIndex(null);
                  }}
                >
                  <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
                    <EuiFlexItem>
                      <EuiText size="s">
                        <strong>{humanizeTagType(group.tag)}</strong>
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiBadge color="hollow" data-test-subj="contextSignalGroupCount">
                        {i18n.translate('xpack.contextEngine.aiIndexDetail.signals.groupCount', {
                          defaultMessage: '{count, plural, one {# signal} other {# signals}}',
                          values: { count: group.count },
                        })}
                      </EuiBadge>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiPanel>
                {groupIndex < groups.length - 1 && <EuiSpacer size="s" />}
              </React.Fragment>
            ))}
          </div>
        )
      ) : (
        <div data-test-subj="contextSignalsGroupDetail">
          <EuiButtonEmpty
            size="s"
            iconType="arrowLeft"
            onClick={() => {
              setSelectedTag(undefined);
              setFlyoutIndex(null);
            }}
            data-test-subj="contextSignalsBackToGroupsButton"
          >
            {i18n.translate('xpack.contextEngine.aiIndexDetail.signals.backToGroupsButton', {
              defaultMessage: 'Back to all signals',
            })}
          </EuiButtonEmpty>
          <EuiSpacer size="s" />
          {isLoadingSignals ? (
            <EuiSkeletonText lines={3} data-test-subj="contextSignalsGroupLoading" />
          ) : signals.length === 0 ? (
            <EuiText size="s" color="subdued" data-test-subj="contextSignalsGroupEmpty">
              <p>
                {i18n.translate('xpack.contextEngine.aiIndexDetail.signals.groupEmpty', {
                  defaultMessage: 'No signals found for this group.',
                })}
              </p>
            </EuiText>
          ) : (
            signals.map((signal, signalIndex) => (
              <React.Fragment key={signal.signal_id}>
                <SignalRow signal={signal} onViewDetails={() => setFlyoutIndex(signalIndex)} />
                {signalIndex < signals.length - 1 && <EuiSpacer size="s" />}
              </React.Fragment>
            ))
          )}
        </div>
      )}

      {flyoutIndex !== null && signals[flyoutIndex] && (
        <SignalDetailFlyout
          signals={signals}
          index={flyoutIndex}
          onNavigate={setFlyoutIndex}
          onClose={() => setFlyoutIndex(null)}
        />
      )}
    </EuiPanel>
  );
};
