/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { FormattedMessage } from '@kbn/i18n-react';
import { CancelLoadingState } from '../../../../../../types';
import { ReindexStatus, DataStreamReindexStep } from '../../../../../../../../../common/types';
import type { ReindexState } from '../../../use_reindex_state';

export const ReindexingDocumentsStepTitle: React.FunctionComponent<{
  reindexState: ReindexState;
}> = ({ reindexState: { lastCompletedStep, status, cancelLoadingState } }) => {
  switch (cancelLoadingState) {
    case CancelLoadingState.Requested:
    case CancelLoadingState.Loading:
      return (
        <FormattedMessage
          id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingChecklist.cancelButton.cancellingLabel"
          defaultMessage="Cancelling…"
        />
      );
      break;
    case CancelLoadingState.Success:
      return (
        <FormattedMessage
          id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingChecklist.cancelButton.cancelledLabel"
          defaultMessage="Cancelled"
        />
      );
      break;
    case CancelLoadingState.Error:
      return (
        <FormattedMessage
          id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingChecklist.cancelButton.errorLabel"
          defaultMessage="Failed to cancel reindexing"
        />
      );
  }

  switch (status) {
    case ReindexStatus.inProgress: {
      if (lastCompletedStep === DataStreamReindexStep.reindexStarted) {
        return (
          <FormattedMessage
            id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingChecklist.inProgress.reindexingDocumentsStepTitle"
            defaultMessage="Reindexing indices."
          />
        );
      } else {
        return (
          <FormattedMessage
            id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingChecklist.inProgress.reindexingDocumentsStepTitle"
            defaultMessage="Starting reindexing."
          />
        );
      }
    }
    case ReindexStatus.failed:
      return (
        <FormattedMessage
          id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingChecklist.failed.reindexingDocumentsStepTitle"
          defaultMessage="Reindexing failed"
        />
      );
    case ReindexStatus.paused:
      return (
        <FormattedMessage
          id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingChecklist.paused.reindexingDocumentsStepTitle"
          defaultMessage="Reindexing paused"
        />
      );
    case ReindexStatus.fetchFailed:
      return (
        <FormattedMessage
          id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingChecklist.fetchFailed.reindexingDocumentsStepTitle"
          defaultMessage="Fetching status failed"
        />
      );
    case ReindexStatus.cancelled:
      return (
        <FormattedMessage
          id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingChecklist.cancelled.reindexingDocumentsStepTitle"
          defaultMessage="Reindexing cancelled"
        />
      );
    case ReindexStatus.completed:
      return (
        <FormattedMessage
          id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingChecklist.completed.reindexingDocumentsStepTitle"
          defaultMessage="Reindexing completed"
        />
      );
  }

  return (
    <FormattedMessage
      id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingChecklist.inProgress.reindexingDocumentsStepTitle"
      defaultMessage="Reindex indices"
    />
  );
};
