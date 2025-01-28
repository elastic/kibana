/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { i18n } from '@kbn/i18n';
import { ReindexStatus, DataStreamReindexStep } from '../../../../../../../../../common/types';
import type { ReindexState } from '../../../use_reindex_state';
import { StepProgress, StepProgressStep } from '../../../../reindex/flyout/step_progress';
import { getDataStreamReindexProgressLabel } from '../../../../../../../lib/utils';
import { ReindexingDocumentsStepTitle } from './progress_title';

interface Props {
  reindexState: ReindexState;
}

/**
 * Displays a list of steps in the reindex operation, the current status, a progress bar,
 * and any error messages that are encountered.
 */
export const ReindexProgress: React.FunctionComponent<Props> = (props) => {
  const { lastCompletedStep, status, reindexTaskPercComplete, taskStatus } = props.reindexState;

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

  const inProgress =
    status === ReindexStatus.inProgress &&
    lastCompletedStep === DataStreamReindexStep.reindexStarted;
  console.log('inProgress::', inProgress);
  console.log('taskStatus::', taskStatus);

  if (
    status === ReindexStatus.failed &&
    (lastCompletedStep === DataStreamReindexStep.created ||
      lastCompletedStep === DataStreamReindexStep.reindexStarted)
  ) {
    reindexingDocsStep.status = 'failed';
  } else if (
    status === ReindexStatus.paused &&
    (lastCompletedStep === DataStreamReindexStep.created ||
      lastCompletedStep === DataStreamReindexStep.reindexStarted)
  ) {
    reindexingDocsStep.status = 'paused';
  } else if (
    status === ReindexStatus.cancelled &&
    (lastCompletedStep === DataStreamReindexStep.created ||
      lastCompletedStep === DataStreamReindexStep.reindexStarted)
  ) {
    reindexingDocsStep.status = 'cancelled';
  } else if (status === undefined || lastCompletedStep < DataStreamReindexStep.created) {
    reindexingDocsStep.status = 'incomplete';
  } else if (
    lastCompletedStep === DataStreamReindexStep.created ||
    lastCompletedStep === DataStreamReindexStep.reindexStarted
  ) {
    reindexingDocsStep.status = 'inProgress';
  } else {
    reindexingDocsStep.status = 'complete';
  }

  return (
    <>
      <EuiTitle size="xs" data-test-subj="reindexChecklistTitle">
        <h3>
          {status === ReindexStatus.inProgress ? (
            <FormattedMessage
              id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingInProgressTitle"
              defaultMessage="Data Stream Reindexing in progress… {percents}"
              values={{
                percents: getDataStreamReindexProgressLabel(
                  reindexTaskPercComplete,
                  lastCompletedStep
                ),
              }}
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
      {inProgress && taskStatus && (
        <ul>
          <li>
            {i18n.translate('progressStep.completeTitle', {
              defaultMessage:
                '{count, plural, =0 {Unknown} =1 {# index} other {# indices}} completed',
              values: { count: taskStatus.successCount || 0 },
            })}
          </li>

          <li>
            {i18n.translate('progressStep.inProgressTitle', {
              defaultMessage:
                '{count, plural, =0 {Unknown} =1 {# index} other {# indices}} currently in progress',
              values: { count: taskStatus.inProgressCount || 0 },
            })}
          </li>
          <li>
            {i18n.translate('progressStep.pendingTitle', {
              defaultMessage:
                '{count, plural, =0 {Unknown} =1 {# index} other {# indices}} pending to start',
              values: { count: taskStatus.pendingCount || 0 },
            })}
          </li>
          <li>
            {i18n.translate('progressStep.failedTitle', {
              defaultMessage:
                '{count, plural, =0 {Unknown} =1 {# index} other {# indices}} failed to migrate',
              values: { count: taskStatus.errorsCount || 0 },
            })}
          </li>
        </ul>
      )}
    </>
  );
};
