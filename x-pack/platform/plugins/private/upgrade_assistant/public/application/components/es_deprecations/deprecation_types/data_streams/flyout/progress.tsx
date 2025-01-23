/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiLink, EuiText, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { i18n } from '@kbn/i18n';
import { ReindexStatus, DataStreamReindexStep } from '../../../../../../../common/types';
import { CancelLoadingState } from '../../../../types';
import type { ReindexState } from '../use_reindex_state';
import { StepProgress, StepProgressStep } from './step_progress';
import { getDataStreamReindexProgressLabel } from '../../../../../lib/utils';

const ErrorCallout: React.FunctionComponent<{ errorMessage: string | null }> = ({
  errorMessage,
}) => (
  <EuiCallOut color="danger" title="There was an error">
    <EuiText>
      <p>{errorMessage}</p>
    </EuiText>
  </EuiCallOut>
);

const PausedCallout = () => (
  <EuiCallOut
    color="warning"
    title="This step was paused due to a Kibana restart. Click 'Resume' below to continue."
  />
);

const ReindexingDocumentsStepTitle: React.FunctionComponent<{
  reindexState: ReindexState;
  cancelReindex: () => void;
}> = ({ reindexState: { lastCompletedStep, status, cancelLoadingState }, cancelReindex }) => {
  if (status === ReindexStatus.cancelled) {
    return (
      <>
        <FormattedMessage
          id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingChecklist.cancelledTitle"
          defaultMessage="Reindexing cancelled."
        />
      </>
    );
  }

  // step is in progress after the new index is created and while it's not completed yet
  const stepInProgress =
    status === ReindexStatus.inProgress &&
    lastCompletedStep === DataStreamReindexStep.reindexStarted;
  // but the reindex can only be cancelled after it has started
  const showCancelLink =
    status === ReindexStatus.inProgress &&
    lastCompletedStep === DataStreamReindexStep.reindexStarted;

  let cancelText: React.ReactNode;
  switch (cancelLoadingState) {
    case CancelLoadingState.Requested:
    case CancelLoadingState.Loading:
      cancelText = (
        <FormattedMessage
          id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingChecklist.cancelButton.cancellingLabel"
          defaultMessage="Cancelling…"
        />
      );
      break;
    case CancelLoadingState.Success:
      cancelText = (
        <FormattedMessage
          id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingChecklist.cancelButton.cancelledLabel"
          defaultMessage="Cancelled"
        />
      );
      break;
    case CancelLoadingState.Error:
      cancelText = (
        <FormattedMessage
          id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingChecklist.cancelButton.errorLabel"
          defaultMessage="Could not cancel"
        />
      );
      break;
    default:
      cancelText = (
        <FormattedMessage
          id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingChecklist.cancelButton.cancelLabel"
          defaultMessage="Cancel"
        />
      );
  }

  return (
    <EuiFlexGroup component="span">
      <EuiFlexItem grow={false}>
        {stepInProgress ? (
          <FormattedMessage
            id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingChecklist.inProgress.reindexingDocumentsStepTitle"
            defaultMessage="Reindexing documents."
          />
        ) : (
          <FormattedMessage
            id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingChecklist.reindexingDocumentsStepTitle"
            defaultMessage="Reindex documents."
          />
        )}
      </EuiFlexItem>
      {showCancelLink && (
        <EuiFlexItem>
          <EuiLink
            data-test-subj="cancelReindexingDocumentsButton"
            onClick={cancelReindex}
            disabled={cancelLoadingState !== undefined}
          >
            {cancelText}
          </EuiLink>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

interface Props {
  reindexState: ReindexState;
  cancelReindex: () => void;
}

/**
 * Displays a list of steps in the reindex operation, the current status, a progress bar,
 * and any error messages that are encountered.
 */
export const ReindexProgress: React.FunctionComponent<Props> = (props) => {
  const {
    errorMessage,
    lastCompletedStep,
    status,
    reindexTaskPercComplete,
    taskStatus,

    meta,
  } = props.reindexState;

  // The reindexing step is special because it generally lasts longer and can be cancelled mid-flight
  const reindexingDocsStep = {
    title: <ReindexingDocumentsStepTitle {...props} />,
  } as StepProgressStep;

  if (
    status === ReindexStatus.failed &&
    (lastCompletedStep === DataStreamReindexStep.created ||
      lastCompletedStep === DataStreamReindexStep.reindexStarted)
  ) {
    reindexingDocsStep.status = 'failed';
    reindexingDocsStep.children = <ErrorCallout {...{ errorMessage }} />;
  } else if (
    status === ReindexStatus.paused &&
    (lastCompletedStep === DataStreamReindexStep.created ||
      lastCompletedStep === DataStreamReindexStep.reindexStarted)
  ) {
    reindexingDocsStep.status = 'paused';
    reindexingDocsStep.children = <PausedCallout />;
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

  const steps: StepProgressStep[] = [
    reindexingDocsStep,
    {
      title: i18n.translate('progressStep.completeTitle', {
        defaultMessage: '{count, plural, =0 {Unknown} =1 {# index} other {# indices}} completed',
        values: { count: taskStatus?.successCount || 0 },
      }),
      status: 'complete',
    },
    {
      title: i18n.translate('progressStep.inProgressTitle', {
        defaultMessage:
          '{count, plural, =0 {Unknown} =1 {# index} other {# indices}} currently in progress',
        values: { count: taskStatus?.inProgressCount || 0 },
      }),
      status: 'inProgress',
    },
    {
      title: i18n.translate('progressStep.pendingTitle', {
        defaultMessage:
          '{count, plural, =0 {Unknown} =1 {# index} other {# indices}} pending to start',
        values: { count: taskStatus?.pendingCount || 0 },
      }),
      status: 'pending',
    },
    {
      title: i18n.translate('progressStep.failedTitle', {
        defaultMessage:
          '{count, plural, =0 {Unknown} =1 {# index} other {# indices}} failed to migrate',
        values: { count: taskStatus?.errorsCount || 0 },
      }),
      status: 'failed',
    },
  ];

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
      <StepProgress steps={steps} />
    </>
  );
};
