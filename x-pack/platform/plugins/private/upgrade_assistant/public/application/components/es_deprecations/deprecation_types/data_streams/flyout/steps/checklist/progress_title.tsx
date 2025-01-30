/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { FormattedMessage } from '@kbn/i18n-react';
import { CancelLoadingState } from '../../../../../../types';
import { DataStreamReindexStatus } from '../../../../../../../../../common/types';
import type { ReindexState } from '../../../use_reindex_state';

export const ReindexingDocumentsStepTitle: React.FunctionComponent<{
  reindexState: ReindexState;
}> = ({ reindexState: { status, cancelLoadingState } }) => {
  switch (cancelLoadingState) {
    case CancelLoadingState.Requested:
    case CancelLoadingState.Loading: {
      return (
        <FormattedMessage
          id="xpack.upgradeAssistant.dataStream.reindexing.flyout.checklistStep.reindexingChecklist.cancelButton.cancellingLabel"
          defaultMessage="Cancelling…"
        />
      );
    }
    case CancelLoadingState.Success: {
      return (
        <FormattedMessage
          id="xpack.upgradeAssistant.dataStream.reindexing.flyout.checklistStep.reindexingChecklist.cancelButton.cancelledLabel"
          defaultMessage="Cancelled"
        />
      );
    }
    case CancelLoadingState.Error: {
      return (
        <FormattedMessage
          id="xpack.upgradeAssistant.dataStream.reindexing.flyout.checklistStep.reindexingChecklist.cancelButton.errorLabel"
          defaultMessage="Failed to cancel reindexing"
        />
      );
    }
  }

  switch (status) {
    case DataStreamReindexStatus.inProgress: {
      return (
        <FormattedMessage
          id="xpack.upgradeAssistant.dataStream.reindexing.flyout.checklistStep.reindexingChecklist.inProgress.reindexingDocumentsStepTitle"
          defaultMessage="Reindexing data stream"
        />
      );
    }
    case DataStreamReindexStatus.failed:
      return (
        <FormattedMessage
          id="xpack.upgradeAssistant.dataStream.reindexing.flyout.checklistStep.reindexingChecklist.failed.reindexingDocumentsStepTitle"
          defaultMessage="Reindexing failed"
        />
      );
    case DataStreamReindexStatus.fetchFailed:
      return (
        <FormattedMessage
          id="xpack.upgradeAssistant.dataStream.reindexing.flyout.checklistStep.reindexingChecklist.fetchFailed.reindexingDocumentsStepTitle"
          defaultMessage="Fetching status failed"
        />
      );
    case DataStreamReindexStatus.cancelled:
      return (
        <FormattedMessage
          id="xpack.upgradeAssistant.dataStream.reindexing.flyout.checklistStep.reindexingChecklist.cancelled.reindexingDocumentsStepTitle"
          defaultMessage="Reindexing cancelled"
        />
      );
    case DataStreamReindexStatus.completed:
      return (
        <FormattedMessage
          id="xpack.upgradeAssistant.dataStream.reindexing.flyout.checklistStep.reindexingChecklist.completed.reindexingDocumentsStepTitle"
          defaultMessage="Reindexing completed"
        />
      );
    case DataStreamReindexStatus.notStarted:
    default: {
      return (
        <FormattedMessage
          id="xpack.upgradeAssistant.dataStream.reindexing.flyout.checklistStep.reindexingChecklist.inProgress.reindexingDocumentsStepTitle"
          defaultMessage="Reindex data stream"
        />
      );
    }
  }
};
