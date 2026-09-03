/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPanel,
  EuiSelect,
  EuiSwitch,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { AiIndexHttpItem } from '../../../../common/http_api/ai_indices';
import { useRunFeedbackAnalysis } from '../../hooks/use_run_feedback_analysis';
import { useUpdateFeedbackAnalysis } from '../../hooks/use_update_feedback_analysis';
import { FeedbackAgentSelector } from './feedback_agent_selector';

interface FeedbackAnalysisConfigProps {
  aiIndex: AiIndexHttpItem;
  /** Hidden when Agent Builder is unavailable — without it, nothing here can run. */
  showAgentSelector: boolean;
}

const INTERVAL_OPTIONS = [
  { value: '1h', text: '1 hour' },
  { value: '6h', text: '6 hours' },
  { value: '12h', text: '12 hours' },
  { value: '24h', text: '24 hours' },
  { value: '7d', text: '7 days' },
];

const SIGNAL_WINDOW_OPTIONS = [
  { value: 'now-24h', text: 'Last 24 hours' },
  { value: 'now-7d', text: 'Last 7 days' },
  { value: 'now-30d', text: 'Last 30 days' },
  { value: 'now-90d', text: 'Last 90 days' },
];

const DEFAULT_INTERVAL = '24h';
const DEFAULT_SIGNAL_WINDOW = 'now-30d';

/**
 * The per-index analysis configuration, plus a manual run.
 *
 * "Run now" is only offered while analysis is enabled: turning it off uninstalls the scheduled
 * workflow, so there would be nothing to execute. Offering a button that always failed would be
 * worse than saying why it is unavailable.
 */
export const FeedbackAnalysisConfig = ({
  aiIndex,
  showAgentSelector,
}: FeedbackAnalysisConfigProps) => {
  const updateConfig = useUpdateFeedbackAnalysis(aiIndex);
  const runAnalysis = useRunFeedbackAnalysis(aiIndex.id);

  const config = aiIndex.feedback_analysis;
  const isEnabled = config?.enabled ?? false;
  const interval = config?.schedule?.interval ?? DEFAULT_INTERVAL;
  const signalFrom = config?.signal_time_range?.from ?? DEFAULT_SIGNAL_WINDOW;

  return (
    <EuiPanel hasBorder={false} hasShadow={false} color="subdued" paddingSize="m">
      <EuiFlexGroup alignItems="flexEnd" gutterSize="m" wrap>
        <EuiFlexItem grow={false}>
          <EuiFormRow hasEmptyLabelSpace>
            <EuiSwitch
              compressed
              checked={isEnabled}
              disabled={updateConfig.isLoading}
              onChange={(event) => updateConfig.mutate({ enabled: event.target.checked })}
              label={i18n.translate(
                'xpack.contextEngine.aiIndexDetail.improvements.config.enabledLabel',
                { defaultMessage: 'Analyze on a schedule' }
              )}
              data-test-subj="contextImprovementsEnabledSwitch"
            />
          </EuiFormRow>
        </EuiFlexItem>

        {showAgentSelector && (
          <EuiFlexItem grow={false}>
            <FeedbackAgentSelector aiIndex={aiIndex} />
          </EuiFlexItem>
        )}

        <EuiFlexItem grow={false}>
          <EuiFormRow
            label={i18n.translate(
              'xpack.contextEngine.aiIndexDetail.improvements.config.intervalLabel',
              { defaultMessage: 'Run every' }
            )}
          >
            <EuiSelect
              compressed
              options={INTERVAL_OPTIONS}
              value={interval}
              disabled={!isEnabled || updateConfig.isLoading}
              onChange={(event) =>
                updateConfig.mutate({ schedule: { interval: event.target.value } })
              }
              data-test-subj="contextImprovementsIntervalSelect"
            />
          </EuiFormRow>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiFormRow
            label={i18n.translate(
              'xpack.contextEngine.aiIndexDetail.improvements.config.signalWindowLabel',
              { defaultMessage: 'Signals from' }
            )}
          >
            <EuiSelect
              compressed
              options={SIGNAL_WINDOW_OPTIONS}
              value={signalFrom}
              disabled={!isEnabled || updateConfig.isLoading}
              onChange={(event) =>
                updateConfig.mutate({
                  signal_time_range: { type: 'relative', from: event.target.value },
                })
              }
              data-test-subj="contextImprovementsSignalWindowSelect"
            />
          </EuiFormRow>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiFormRow hasEmptyLabelSpace>
            <EuiButton
              size="s"
              iconType="play"
              onClick={() => runAnalysis.mutate()}
              isLoading={runAnalysis.isLoading}
              isDisabled={!isEnabled}
              title={
                isEnabled
                  ? undefined
                  : i18n.translate(
                      'xpack.contextEngine.aiIndexDetail.improvements.config.runDisabledHelp',
                      {
                        defaultMessage:
                          'Turn on scheduled analysis to run one. With it off there is no analysis workflow to execute.',
                      }
                    )
              }
              data-test-subj="contextImprovementsRunNowButton"
            >
              {i18n.translate(
                'xpack.contextEngine.aiIndexDetail.improvements.config.runNowButton',
                {
                  defaultMessage: 'Run now',
                }
              )}
            </EuiButton>
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
