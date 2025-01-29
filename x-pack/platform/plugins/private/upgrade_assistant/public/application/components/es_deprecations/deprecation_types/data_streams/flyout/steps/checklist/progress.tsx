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

interface Props {
  reindexState: ReindexState;
}

/**
 * Displays a list of steps in the reindex operation, the current status, a progress bar,
 * and any error messages that are encountered.
 */
export const ReindexProgress: React.FunctionComponent<Props> = (props) => {
  const { status, reindexTaskPercComplete, taskStatus } = props.reindexState;

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
  console.log('inProgress::', inProgress);
  console.log('taskStatus::', taskStatus);

  if (status === DataStreamReindexStatus.failed) {
    reindexingDocsStep.status = 'failed';
    euiProgressColor = 'danger';
  } else if (status === DataStreamReindexStatus.cancelled) {
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
          <EuiSpacer size="m" />
          <EuiFlexGroup direction="column" gutterSize="m">
            <EuiFlexItem>
              <EuiText>
                <p>
                  {i18n.translate('progressStep.completeTitle', {
                    defaultMessage:
                      '{count, plural, =0 {Unknown} =1 {# index} other {# indices}} completed',
                    values: { count: taskStatus.successCount || 0 },
                  })}
                </p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText>
                <p>
                  {i18n.translate('progressStep.inProgressTitle', {
                    defaultMessage:
                      '{count, plural, =0 {Unknown} =1 {# index} other {# indices}} currently in progress',
                    values: { count: taskStatus.inProgressCount || 0 },
                  })}
                </p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText>
                <p>
                  {i18n.translate('progressStep.pendingTitle', {
                    defaultMessage:
                      '{count, plural, =0 {Unknown} =1 {# index} other {# indices}} pending to start',
                    values: { count: taskStatus.pendingCount || 0 },
                  })}
                </p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText>
                <p>
                  {i18n.translate('progressStep.failedTitle', {
                    defaultMessage:
                      '{count, plural, =0 {Unknown} =1 {# index} other {# indices}} failed to migrate',
                    values: { count: taskStatus.errorsCount || 0 },
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
