/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiToolTip } from '@elastic/eui';
import { WORKFLOWS_APP_ID } from '@kbn/deeplinks-workflows';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { useWorkflowsCapabilities } from '@kbn/workflows-ui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CONTEXT_ENGINE_UI_EBT } from '../../../../../common/telemetry';
import {
  dreamingBuildsAnything,
  type AiIndexDreamingConfig,
  type DreamingLastRun,
} from '../../../../../common/dreaming';
import { useRunDreaming } from '../../../hooks/use_run_dreaming';
import { useKibana } from '../../../hooks/use_kibana';
import { getWorkflowExecutionPath } from '../../../utils/get_workflow_execution_path';
import { WorkflowLastExecution } from '../workflow_last_execution';

const notRunYetLabel = i18n.translate('xpack.contextEngine.aiIndexDetail.dreaming.runs.notRunYet', {
  defaultMessage: 'Not run yet.',
});

export interface DreamingLastRunStatusProps {
  lastRun: DreamingLastRun | undefined;
}

/** Linked last-run time for the schedule settings description column. */
export const DreamingLastRunStatus = ({ lastRun }: DreamingLastRunStatusProps) => {
  const {
    services: { application },
  } = useKibana();

  const lastRunHref =
    lastRun !== undefined
      ? application.getUrlForApp(WORKFLOWS_APP_ID, {
          path: getWorkflowExecutionPath(lastRun.workflow_id, lastRun.execution_id),
        })
      : undefined;

  if (lastRun !== undefined) {
    return (
      <WorkflowLastExecution
        status={lastRun.status}
        startedAt={lastRun.started_at}
        href={lastRunHref}
        data-test-subj="contextAiIndexDreamingLastRun"
      />
    );
  }

  return (
    <WorkflowLastExecution
      emptyMessage={notRunYetLabel}
      data-test-subj="contextAiIndexDreamingLastRun"
    />
  );
};

export interface DreamingRunsSectionProps {
  aiIndexId: string;
  savedDreaming: AiIndexDreamingConfig;
  lastRun: DreamingLastRun | undefined;
  isDirty: boolean;
}

const savedDreamingCanRun = (dreaming: AiIndexDreamingConfig): boolean =>
  dreamingBuildsAnything(dreaming);

const awaitingLastRun = (
  startedExecutionIds: readonly string[],
  lastRun: DreamingLastRun | undefined
): boolean =>
  startedExecutionIds.length > 0 &&
  (lastRun === undefined || !startedExecutionIds.includes(lastRun.execution_id));

/** Manual run control and last-run status for the dreaming schedule settings. */
export const DreamingRunsSection = ({
  aiIndexId,
  savedDreaming,
  lastRun,
  isDirty,
}: DreamingRunsSectionProps) => {
  const { canExecuteWorkflow } = useWorkflowsCapabilities();
  const [startedExecutionIds, setStartedExecutionIds] = useState<readonly string[]>([]);
  const { runDreaming, isLoading: isRunLoading } = useRunDreaming({
    onStarted: (response) =>
      setStartedExecutionIds(response.executions.map(({ execution_id }) => execution_id)),
  });

  useEffect(() => {
    if (startedExecutionIds.length === 0 || lastRun === undefined) {
      return;
    }
    if (startedExecutionIds.includes(lastRun.execution_id)) {
      setStartedExecutionIds([]);
    }
  }, [lastRun, startedExecutionIds]);

  const isRunning =
    isRunLoading || lastRun?.is_running === true || awaitingLastRun(startedExecutionIds, lastRun);

  const runDisabledReason = useMemo((): string | undefined => {
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
    if (!savedDreamingCanRun(savedDreaming)) {
      return i18n.translate('xpack.contextEngine.aiIndexDetail.dreaming.runs.disabledNotReady', {
        defaultMessage: 'Add fact or entity types to run',
      });
    }
    return undefined;
  }, [canExecuteWorkflow, isDirty, savedDreaming]);

  const isRunDisabled = runDisabledReason !== undefined;

  const handleRun = useCallback(() => {
    if (isRunDisabled) {
      return;
    }
    runDreaming(aiIndexId);
  }, [aiIndexId, isRunDisabled, runDreaming]);

  const runButton = (
    <EuiButton
      size="s"
      iconType="play"
      onClick={handleRun}
      isLoading={isRunning}
      isDisabled={isRunDisabled}
      data-test-subj="contextAiIndexDreamingRunNow"
      {...getEbtProps({
        element: CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageDreamingPanel,
        action: CONTEXT_ENGINE_UI_EBT.action.dreaming.RUN_NOW,
      })}
    >
      {i18n.translate('xpack.contextEngine.aiIndexDetail.dreaming.runs.runNow', {
        defaultMessage: 'Run now',
      })}
    </EuiButton>
  );

  const runControl =
    runDisabledReason !== undefined ? (
      <EuiToolTip content={runDisabledReason} disableScreenReaderOutput>
        {runButton}
      </EuiToolTip>
    ) : (
      runButton
    );

  return <div data-test-subj="contextAiIndexDreamingRunsSection">{runControl}</div>;
};
