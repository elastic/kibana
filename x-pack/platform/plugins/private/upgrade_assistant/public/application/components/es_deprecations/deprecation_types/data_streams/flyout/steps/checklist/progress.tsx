/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiProgress,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage, FormattedRelativeTime } from '@kbn/i18n-react';

import { i18n } from '@kbn/i18n';
import moment from 'moment';
import { DataStreamMigrationStatus } from '../../../../../../../../../common/types';
import type { MigrationState } from '../../../use_migration_state';
import { getDataStreamReindexProgress } from '../../../../../../../lib/utils';
import { MigrateDocumentsStepTitle } from './progress_title';
import { CancelLoadingState } from '../../../../../../types';
import { StepProgress, type StepProgressStep } from '../../../../../common/step_progress';

interface Props {
  migrationState: MigrationState;
  dataStreamName?: string;
}

/**
 * Displays a list of steps in the reindex operation, the current status, a progress bar,
 * and any error messages that are encountered.
 */
export const MigrationProgress: React.FunctionComponent<Props> = (props) => {
  const {
    dataStreamName,
    migrationState: { status, taskPercComplete, cancelLoadingState, taskStatus, resolutionType },
  } = props;

  // The reindexing step is special because it generally lasts longer and can be cancelled mid-flight
  const reindexingDocsStep = {
    title: (
      <EuiFlexGroup component="span">
        <EuiFlexItem grow={false}>
          <MigrateDocumentsStepTitle {...props} />
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
  } as StepProgressStep;

  const inProgress =
    status === DataStreamMigrationStatus.inProgress ||
    status === DataStreamMigrationStatus.completed;

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
  } else if (status === DataStreamMigrationStatus.failed) {
    reindexingDocsStep.status = 'failed';
    euiProgressColor = 'danger';
  } else if (
    status === DataStreamMigrationStatus.cancelled ||
    cancelLoadingState === CancelLoadingState.Success
  ) {
    reindexingDocsStep.status = 'cancelled';
  } else if (status === undefined) {
    reindexingDocsStep.status = 'incomplete';
    euiProgressColor = 'subdued';
  } else if (status === DataStreamMigrationStatus.inProgress) {
    reindexingDocsStep.status = 'inProgress';
    euiProgressColor = 'primary';
  } else if (status === DataStreamMigrationStatus.completed) {
    reindexingDocsStep.status = 'complete';
    euiProgressColor = 'success';
  } else {
    // not started // undefined
    reindexingDocsStep.status = 'incomplete';
    euiProgressColor = 'subdued';
  }

  const progressPercentage = inProgress
    ? getDataStreamReindexProgress(status, taskPercComplete)
    : undefined;
  const showProgressValueText = inProgress;
  const progressMaxValue = inProgress ? 100 : undefined;

  return (
    <EuiFlexGroup direction="column" gutterSize="none">
      <EuiFlexItem>
        <EuiTitle size="xs" data-test-subj="reindexChecklistTitle">
          <h3>
            {status === DataStreamMigrationStatus.inProgress ? (
              <FormattedMessage
                id="xpack.upgradeAssistant.dataStream.migration.flyout.checklistStep.reindexingInProgressTitle"
                defaultMessage="{resolutionType, select, reindex {Reindexing} readonly {Setting to read-only} other {Migration}} {dataStreamName} in progress…"
                values={{
                  resolutionType,
                  dataStreamName: dataStreamName && <EuiCode>{dataStreamName}</EuiCode>,
                }}
              />
            ) : (
              <FormattedMessage
                id="xpack.upgradeAssistant.dataStream.migration.flyout.checklistStep.reindexingChecklistTitle"
                defaultMessage="{resolutionType, select, reindex {Reindex {dataStreamName}} readonly {Set {dataStreamName} to read-only} other {Migrate data stream}}"
                values={{
                  resolutionType,
                  dataStreamName: dataStreamName && <EuiCode>{dataStreamName}</EuiCode>,
                }}
              />
            )}
          </h3>
        </EuiTitle>
      </EuiFlexItem>
      {inProgress && (
        <EuiFlexItem>
          <EuiSpacer size="s" />
          <EuiProgress
            label={
              taskStatus ? (
                <FormattedMessage
                  id="xpack.upgradeAssistant.dataStream.migration.flyout.checklistStep.reindexingInProgressTitle"
                  defaultMessage="Started {startTimeFromNow}"
                  values={{
                    startTimeFromNow: (
                      <FormattedRelativeTime
                        value={(taskStatus.startTimeMs - +moment()) / 1000}
                        updateIntervalInSeconds={1}
                      />
                    ),
                  }}
                />
              ) : undefined
            }
            valueText={showProgressValueText}
            value={progressPercentage}
            max={progressMaxValue}
            color={euiProgressColor}
            size="m"
          />
        </EuiFlexItem>
      )}
      <EuiFlexItem>
        <StepProgress steps={[reindexingDocsStep]} />
      </EuiFlexItem>
      {inProgress && (
        <EuiFlexItem>
          {!taskStatus && (
            <p>
              <FormattedMessage
                id="xpack.upgradeAssistant.dataStream.migration.flyout.checklistStep.fetchingStatus"
                defaultMessage="Fetching Status…"
              />
            </p>
          )}
          {taskStatus && (
            <EuiFlexGroup direction="column" gutterSize="xs" style={{ padding: '0 28px' }}>
              {taskStatus.errorsCount > 0 && (
                <EuiFlexItem>
                  <EuiText size="s" color="danger">
                    <p>
                      {i18n.translate(
                        'xpack.upgradeAssistant.dataStream.migration.flyout.checklistStep.progressStep.failedTitle',
                        {
                          defaultMessage:
                            '{count, plural, =1 {# Index} other {# Indices}} failed to get {resolutionType, select, reindex {reindexed} readonly {set to read-only} other {migrated}}.',
                          values: { count: taskStatus.errorsCount, resolutionType },
                        }
                      )}
                    </p>
                  </EuiText>
                </EuiFlexItem>
              )}
              <EuiFlexItem>
                <EuiText size="s" color="success">
                  <p>
                    {i18n.translate(
                      'xpack.upgradeAssistant.dataStream.migration.flyout.checklistStep.progressStep.completeTitle',
                      {
                        defaultMessage:
                          '{count, plural, =1 {# Index} other {# Indices}} successfully {resolutionType, select, reindex {reindexed} readonly {set to read-only} other {migrated}}.',
                        values: { count: taskStatus.successCount, resolutionType },
                      }
                    )}
                  </p>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="s" color="primary">
                  <p>
                    {i18n.translate(
                      'xpack.upgradeAssistant.dataStream.migration.flyout.checklistStep.progressStep.inProgressTitle',
                      {
                        defaultMessage:
                          '{count, plural, =1 {# Index} other {# Indices}} currently getting {resolutionType, select, reindex {reindexed} readonly {set to read-only} other {migrated}}.',
                        values: { count: taskStatus.inProgressCount, resolutionType },
                      }
                    )}
                  </p>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="s">
                  <p>
                    {i18n.translate(
                      'xpack.upgradeAssistant.dataStream.migration.flyout.checklistStep.progressStep.pendingTitle',
                      {
                        defaultMessage:
                          '{count, plural, =1 {# Index} other {# Indices}} waiting to start.',
                        values: { count: taskStatus.pendingCount },
                      }
                    )}
                  </p>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
