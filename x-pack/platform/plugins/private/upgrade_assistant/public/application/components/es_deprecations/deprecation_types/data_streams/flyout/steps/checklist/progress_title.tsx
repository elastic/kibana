/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { FormattedMessage } from '@kbn/i18n-react';
import { CancelLoadingState } from '../../../../../../types';
import { DataStreamMigrationStatus } from '../../../../../../../../../common/types';
import type { MigrationState } from '../../../use_migration_state';

export const MigrateDocumentsStepTitle: React.FunctionComponent<{
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
          defaultMessage="Failed to cancel {resolutionType, select, reindex {reindexing} readonly {read-only} other {}}"
          values={{ resolutionType }}
        />
      );
    }
  }

  switch (status) {
    case DataStreamMigrationStatus.inProgress: {
      return (
        <FormattedMessage
          id="xpack.upgradeAssistant.dataStream.migration.flyout.checklistStep.reindexingChecklist.inProgress.reindexingDocumentsStepTitle"
          defaultMessage="{resolutionType, select, reindex {Reindexing} readonly {Setting to read-only} other {}}"
          values={{ resolutionType }}
        />
      );
    }
    case DataStreamMigrationStatus.failed:
      return (
        <FormattedMessage
          id="xpack.upgradeAssistant.dataStream.migration.flyout.checklistStep.reindexingChecklist.failed.reindexingDocumentsStepTitle"
          defaultMessage="Failed to {resolutionType, select, reindex {reindex} readonly {set to read-only} other {}}"
          values={{ resolutionType }}
        />
      );
    case DataStreamMigrationStatus.fetchFailed:
      return (
        <FormattedMessage
          id="xpack.upgradeAssistant.dataStream.migration.flyout.checklistStep.reindexingChecklist.fetchFailed.reindexingDocumentsStepTitle"
          defaultMessage="Fetching status failed"
        />
      );
    case DataStreamMigrationStatus.cancelled:
      return (
        <FormattedMessage
          id="xpack.upgradeAssistant.dataStream.migration.flyout.checklistStep.reindexingChecklist.cancelled.reindexingDocumentsStepTitle"
          defaultMessage="{resolutionType, select, reindex {Reindexing} readonly {Setting to read-only} other {}} cancelled"
          values={{ resolutionType }}
        />
      );
    case DataStreamMigrationStatus.completed:
      return (
        <FormattedMessage
          id="xpack.upgradeAssistant.dataStream.migration.flyout.checklistStep.reindexingChecklist.completed.reindexingDocumentsStepTitle"
          defaultMessage="{resolutionType, select, reindex {Reindexing} readonly {Setting to read-only} other {}} completed"
          values={{ resolutionType }}
        />
      );
    case DataStreamMigrationStatus.notStarted:
    default: {
      return (
        <FormattedMessage
          id="xpack.upgradeAssistant.dataStream.migration.flyout.checklistStep.reindexingChecklist.notStarted.reindexingDocumentsStepTitle"
          defaultMessage="{resolutionType, select, reindex {Reindex data stream} readonly {Set data stream to read-only} other {Unknown action}}"
          values={{ resolutionType }}
        />
      );
    }
  }
};
