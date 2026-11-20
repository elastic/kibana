/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiToolTip } from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { useWorkflowsCapabilities } from '@kbn/workflows-ui';
import React from 'react';
import { CONTEXT_ENGINE_UI_EBT } from '../../../../../common/telemetry';
import {
  dreamingBuildsAnything,
  isDreamingOn,
  type AiIndexDreamingConfig,
} from '../../../../../common/dreaming';
import { useRunDreaming } from '../../../hooks/use_run_dreaming';

export interface DreamingRunsSectionProps {
  aiIndexId: string;
  savedDreaming: AiIndexDreamingConfig;
  latestIsRunning: boolean;
  isDirty: boolean;
}

const runNowLabel = i18n.translate('xpack.contextEngine.aiIndexDetail.dreaming.runs.runNow', {
  defaultMessage: 'Run now',
});

/** Manual run control for the dreaming schedule settings. */
export const DreamingRunsSection = ({
  aiIndexId,
  savedDreaming,
  latestIsRunning,
  isDirty,
}: DreamingRunsSectionProps) => {
  const { canExecuteWorkflow } = useWorkflowsCapabilities();
  const { runDreaming, isLoading: isRunLoading } = useRunDreaming();

  const isRunning = isRunLoading || latestIsRunning;

  const runDisabledReason = ((): string | undefined => {
    if (isDirty) {
      return i18n.translate('xpack.contextEngine.aiIndexDetail.dreaming.runs.disabledDirty', {
        defaultMessage: 'Save your changes first',
      });
    }
    if (!canExecuteWorkflow) {
      return i18n.translate(
        'xpack.contextEngine.aiIndexDetail.dreaming.runs.disabledNoExecutePermission',
        {
          defaultMessage: 'You do not have permission to run workflows',
        }
      );
    }
    if (!dreamingBuildsAnything(savedDreaming)) {
      return i18n.translate('xpack.contextEngine.aiIndexDetail.dreaming.runs.disabledNotReady', {
        defaultMessage: 'Add fact or entity types to run',
      });
    }
    if (!isDreamingOn(savedDreaming)) {
      return i18n.translate('xpack.contextEngine.aiIndexDetail.dreaming.runs.disabledScheduleOff', {
        defaultMessage: 'Turn on the schedule to run',
      });
    }
    return undefined;
  })();

  const runButton = (
    <EuiButton
      size="s"
      iconType="play"
      onClick={() => runDreaming(aiIndexId)}
      isLoading={isRunning}
      isDisabled={runDisabledReason !== undefined}
      data-test-subj="contextAiIndexDreamingRunNow"
      {...getEbtProps({
        element: CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageDreamingPanel,
        action: CONTEXT_ENGINE_UI_EBT.action.dreaming.RUN_NOW,
      })}
    >
      {runNowLabel}
    </EuiButton>
  );

  return (
    <div data-test-subj="contextAiIndexDreamingRunsSection">
      {runDisabledReason !== undefined ? (
        <EuiToolTip content={runDisabledReason} disableScreenReaderOutput>
          {runButton}
        </EuiToolTip>
      ) : (
        runButton
      )}
    </div>
  );
};
