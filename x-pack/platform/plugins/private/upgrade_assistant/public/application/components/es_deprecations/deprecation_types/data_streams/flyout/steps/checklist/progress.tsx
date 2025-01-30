/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiProgress, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { i18n } from '@kbn/i18n';
import { DataStreamReindexStatus } from '../../../../../../../../../common/types';
import type { ReindexState } from '../../../use_reindex_state';
import { StepProgress, StepProgressStep } from '../../../../reindex/flyout/step_progress';
import { getDataStreamReindexProgress } from '../../../../../../../lib/utils';
import { ReindexingDocumentsStepTitle } from './progress_title';
import { CancelLoadingState } from '../../../../../../types';
interface Props {
  reindexState: ReindexState;
}

/**
 * Displays a list of steps in the reindex operation, the current status, a progress bar,
 * and any error messages that are encountered.
 */
export const ReindexProgress: React.FunctionComponent<Props> = (props) => {
  const { status, reindexTaskPercComplete, cancelLoadingState, taskStatus } = props.reindexState;

  // The reindexing step is special because it generally lasts longer and can be cancelled mid-flight
  const reindexingDocsStep = {
    title: (
      <EuiFlexGroup component="span">
        <EuiFlexItem grow={false}>
          <ReindexingDocumentsStepTitle {...props} />
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
  } as StepProgressStep;

  const inProgress = status === DataStreamReindexStatus.inProgress;

  let euiProgressColor = 'subdued';

  if (cancelLoadingState === CancelLoadingState.Error) {
    reindexingDocsStep.status = 'failed';
    euiProgressColor = 'danger';
  } else if (
    cancelLoadingState === CancelLoadingState.Loading ||
    cancelLoadingState === CancelLoadingState.Requested
  ) {
    reindexingDocsStep.status = 'inProgress';
    euiProgressColor = 'subdued';
  } else if (status === DataStreamReindexStatus.failed) {
    reindexingDocsStep.status = 'failed';
    euiProgressColor = 'danger';
  } else if (
    status === DataStreamReindexStatus.cancelled ||
    cancelLoadingState === CancelLoadingState.Success
  ) {
    reindexingDocsStep.status = 'cancelled';
  } else if (status === undefined) {
    reindexingDocsStep.status = 'incomplete';
    euiProgressColor = 'subdued';
  } else if (status === DataStreamReindexStatus.inProgress) {
    reindexingDocsStep.status = 'inProgress';
    euiProgressColor = 'primary';
  } else if (status === DataStreamReindexStatus.completed) {
    reindexingDocsStep.status = 'complete';
    euiProgressColor = 'success';
  } else {
    // not started // undefined
    reindexingDocsStep.status = 'incomplete';
    euiProgressColor = 'subdued';
  }

  const progressPercentage = inProgress
    ? getDataStreamReindexProgress(status, reindexTaskPercComplete)
    : undefined;
  const showProgressValueText = inProgress;
  const progressMaxValue = inProgress ? 100 : undefined;
  return (
    <>
      <EuiTitle size="xs" data-test-subj="reindexChecklistTitle">
        <h3>
          {status === DataStreamReindexStatus.inProgress ? (
            <FormattedMessage
              id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingInProgressTitle"
              defaultMessage="Data Stream Reindexing in progress…"
            />
          ) : (
            <FormattedMessage
              id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingChecklistTitle"
              defaultMessage="Data Stream Reindexing process"
            />
          )}
        </h3>
      </EuiTitle>
      <StepProgress steps={[reindexingDocsStep]} />
      {inProgress && (
        <EuiProgress
          valueText={showProgressValueText}
          value={progressPercentage}
          max={progressMaxValue}
          color={euiProgressColor}
          size="m"
        />
      )}
      <EuiSpacer size="m" />
      {inProgress && !taskStatus && (
        <p>
          <FormattedMessage
            id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingChecklistTitle"
            defaultMessage="Fetching Status…"
          />
        </p>
      )}
      {inProgress && taskStatus && (
        <>
          <EuiFlexGroup direction="column" gutterSize="s">
            {taskStatus.errorsCount > 0 && (
              <EuiFlexItem>
                <EuiText color="danger">
                  <p>
                    {i18n.translate('progressStep.failedTitle', {
                      defaultMessage:
                        '{count, plural, =1 {# backing index} other {# backing indices}} failed reindexing.',
                      values: { count: taskStatus.errorsCount },
                    })}
                  </p>
                </EuiText>
              </EuiFlexItem>
            )}
            <EuiFlexItem>
              <EuiText color="success">
                <p>
                  {i18n.translate('progressStep.completeTitle', {
                    defaultMessage:
                      '{count, plural, =1 {# backing index} other {# backing indices}} reindexed successfully.',
                    values: { count: taskStatus.successCount },
                  })}
                </p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText color="primary">
                <p>
                  {i18n.translate('progressStep.inProgressTitle', {
                    defaultMessage:
                      '{count, plural, =1 {# backing index} other {# backing indices}} currently reindexing.',
                    values: { count: taskStatus.inProgressCount },
                  })}
                </p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText>
                <p>
                  {i18n.translate('progressStep.pendingTitle', {
                    defaultMessage:
                      '{count, plural, =1 {# backing index} other {# backing indices}} pending to start reindexing.',
                    values: { count: taskStatus.pendingCount },
                  })}
                </p>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
    </>
  );
};
