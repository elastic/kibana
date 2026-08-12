/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
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
import type { SignalGroup } from '../../../../common/http_api/signals';
import { analyzeAndImprove } from '../../utils/analyze_and_improve';
import { useKibana } from '../../hooks/use_kibana';
import { useSignalGroups } from '../../hooks/use_signal_groups';
import { SignalGroupFlyout } from './signal_group_flyout';
import { SignalGroupRow } from './signal_group_row';

interface SignalsPanelProps {
  isLoading: boolean;
  aiIndex: GetAiIndexResponse | undefined;
}

/**
 * Read-only Signals panel. Shows a preaggregated grouped-by-tag list of "issue" cards; clicking a
 * group opens a flyout with its member signals (each drilling into a trace waterfall). A panel-level
 * "Analyze & improve" button opens Agent Builder over all signals once a chat opener is registered.
 */
export const SignalsPanel = ({ isLoading, aiIndex }: SignalsPanelProps) => {
  const {
    services: { getChatOpener },
  } = useKibana();
  // Resolve at render time so the button appears as soon as an opener is registered (#15593),
  // rather than being frozen to whatever existed at mount.
  const chatOpener = getChatOpener?.();

  const { groups, isLoading: isLoadingGroups, error: groupsError } = useSignalGroups();
  const [selectedGroup, setSelectedGroup] = useState<SignalGroup | undefined>();

  const loading = isLoading || isLoadingGroups;

  const handleAnalyze = () => {
    if (aiIndex) {
      analyzeAndImprove(getChatOpener, { aiIndex, tag: undefined });
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
              'Signals are observations classified from Agent Builder traces, grouped by tag. Open a group to inspect individual signals and their traces.',
          })}
        </p>
      </EuiText>
      <EuiSpacer size="m" />

      {loading ? (
        <EuiSkeletonText lines={3} data-test-subj="contextSignalsLoading" />
      ) : groupsError ? (
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
                defaultMessage: 'Something went wrong while loading signals. Try again later.',
              })}
            </p>
          }
        />
      ) : groups.length === 0 ? (
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
        <div data-test-subj="contextSignalsGroups" role="list">
          {groups.map((group, groupIndex) => (
            <React.Fragment key={group.tag}>
              <SignalGroupRow group={group} onView={() => setSelectedGroup(group)} />
              {groupIndex < groups.length - 1 && <EuiSpacer size="s" />}
            </React.Fragment>
          ))}
        </div>
      )}

      {selectedGroup && (
        <SignalGroupFlyout
          group={selectedGroup}
          aiIndex={aiIndex}
          onClose={() => setSelectedGroup(undefined)}
        />
      )}
    </EuiPanel>
  );
};
