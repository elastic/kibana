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
import type { MigrationState } from '../../../use_reindex_state';

export const ReindexingDocumentsStepTitle: React.FunctionComponent<{
  migrationState: MigrationState;
}> = ({ migrationState: { status, cancelLoadingState, resolutionType } }) => {
  switch (cancelLoadingState) {
    case CancelLoadingState.Requested:
    case CancelLoadingState.Loading: {
      return (
        <FormattedMessage
          id="xpack.upgradeAssistant.dataStream.migration.flyout.checklistStep.reindexingChecklist.cancelButton.cancellingLabel"
          defaultMessage="Cancelling…"
        />
      );
    }
    case CancelLoadingState.Success: {
      return (
        <FormattedMessage
          id="xpack.upgradeAssistant.dataStream.migration.flyout.checklistStep.reindexingChecklist.cancelButton.cancelledLabel"
          defaultMessage="Cancelled"
        />
      );
    }
    case CancelLoadingState.Error: {
      return (
        <FormattedMessage
          id="xpack.upgradeAssistant.dataStream.migration.flyout.checklistStep.reindexingChecklist.cancelButton.errorLabel"
          defaultMessage="Failed to cancel {resolutionType, select, reindexing {reindexing} readonly {readonly} other {}}"
          values={{ resolutionType }}
        />
      );
    }
  }

  switch (status) {
    case DataStreamReindexStatus.inProgress: {
      return (
        <FormattedMessage
          id="xpack.upgradeAssistant.dataStream.migration.flyout.checklistStep.reindexingChecklist.inProgress.reindexingDocumentsStepTitle"
          defaultMessage="{resolutionType, select, reindexing {Reindexing} readonly {Marking as readonly} other {}}"
          values={{ resolutionType }}
        />
      );
    }
    case DataStreamReindexStatus.failed:
      return (
        <FormattedMessage
          id="xpack.upgradeAssistant.dataStream.migration.flyout.checklistStep.reindexingChecklist.failed.reindexingDocumentsStepTitle"
          defaultMessage="Failed to {resolutionType, select, reindexing {reindex} readonly {mark as readonly} other {}}"
          values={{ resolutionType }}
        />
      );
    case DataStreamReindexStatus.fetchFailed:
      return (
        <FormattedMessage
          id="xpack.upgradeAssistant.dataStream.migration.flyout.checklistStep.reindexingChecklist.fetchFailed.reindexingDocumentsStepTitle"
          defaultMessage="Fetching status failed"
        />
      );
    case DataStreamReindexStatus.cancelled:
      return (
        <FormattedMessage
          id="xpack.upgradeAssistant.dataStream.migration.flyout.checklistStep.reindexingChecklist.cancelled.reindexingDocumentsStepTitle"
          defaultMessage="{resolutionType, select, reindexing {Reindexing} readonly {Marking as readonly} other {}} cancelled"
          values={{ resolutionType }}
        />
      );
    case DataStreamReindexStatus.completed:
      return (
        <FormattedMessage
          id="xpack.upgradeAssistant.dataStream.migration.flyout.checklistStep.reindexingChecklist.completed.reindexingDocumentsStepTitle"
          defaultMessage="{resolutionType, select, reindexing {Reindexing} readonly {Marking as readonly} other {}} completed"
          values={{ resolutionType }}
        />
      );
    case DataStreamReindexStatus.notStarted:
    default: {
      return (
        <FormattedMessage
          id="xpack.upgradeAssistant.dataStream.migration.flyout.checklistStep.reindexingChecklist.inProgress.reindexingDocumentsStepTitle"
          defaultMessage="{resolutionType, select, reindexing {Reindex data stream} readonly {Mark data stream as readonly} other {Unknown action}}"
        />
      );
    }
  }
};
