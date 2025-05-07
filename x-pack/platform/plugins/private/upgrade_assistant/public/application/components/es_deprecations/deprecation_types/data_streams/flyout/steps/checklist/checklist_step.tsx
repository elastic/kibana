/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  DataStreamMigrationStatus,
  DataStreamResolutionType,
} from '../../../../../../../../../common/types';
import { LoadingState } from '../../../../../../types';
import type { MigrationState } from '../../../use_migration_state';
import { MigrationProgress } from './progress';
import { useAppContext } from '../../../../../../../app_context';
import { getPrimaryButtonLabel } from '../../messages';

/**
 * Displays a flyout that shows the current reindexing status for a given index.
 */
export const ChecklistFlyoutStep: React.FunctionComponent<{
  closeFlyout: () => void;
  migrationState: MigrationState;
  resolutionType: DataStreamResolutionType;
  executeAction: () => void;
  cancelAction: () => void;
}> = ({ closeFlyout, migrationState, resolutionType, executeAction, cancelAction }) => {
  const {
    services: { api },
  } = useAppContext();

  const { loadingState, status, hasRequiredPrivileges } = migrationState;
  const loading =
    loadingState === LoadingState.Loading || status === DataStreamMigrationStatus.inProgress;
  const isCompleted = status === DataStreamMigrationStatus.completed;
  const hasFetchFailed = status === DataStreamMigrationStatus.fetchFailed;
  const hasMigrationFailed = status === DataStreamMigrationStatus.failed;

  const { data: nodes } = api.useLoadNodeDiskSpace();

  const showMainButton = !hasFetchFailed && !isCompleted && hasRequiredPrivileges;
  const shouldShowCancelButton = showMainButton && status === DataStreamMigrationStatus.inProgress;

  return (
    <Fragment>
      <EuiFlyoutBody data-test-subj="dataStreamMigrationChecklistFlyout">
        {hasRequiredPrivileges === false && (
          <Fragment>
            <EuiSpacer />
            <EuiCallOut
              title={
                <FormattedMessage
                  id="xpack.upgradeAssistant.dataStream.migration.flyout.checklistStep.insufficientPrivilegeCallout.calloutTitle"
                  defaultMessage="You do not have sufficient privileges to migrate this data stream"
                />
              }
              color="danger"
              iconType="warning"
              data-test-subj="dsInsufficientPrivilegesCallout"
            />
          </Fragment>
        )}

        {nodes && nodes.length > 0 && (
          <>
            <EuiCallOut
              color="warning"
              iconType="warning"
              data-test-subj="lowDiskSpaceCallout"
              title={
                <FormattedMessage
                  id="xpack.upgradeAssistant.dataStream.migration.flyout.checklistStep.lowDiskSpaceCalloutTitle"
                  defaultMessage="Nodes with low disk space"
                />
              }
            >
              <>
                <FormattedMessage
                  id="xpack.upgradeAssistant.dataStream.migration.flyout.checklistStep.lowDiskSpaceCalloutDescription"
                  defaultMessage="Disk usage has exceeded the low watermark, which may prevent migration. The following nodes are impacted:"
                />

                <EuiSpacer size="s" />

                <ul>
                  {nodes.map(({ nodeName, available, nodeId }) => (
                    <li key={nodeId} data-test-subj="impactedNodeListItem">
                      <FormattedMessage
                        id="xpack.upgradeAssistant.dataStream.migration.flyout.checklistStep.lowDiskSpaceUsedText"
                        defaultMessage="{nodeName} ({available} available)"
                        values={{
                          nodeName,
                          available,
                        }}
                      />
                    </li>
                  ))}
                </ul>
              </>
            </EuiCallOut>
            <EuiSpacer />
          </>
        )}

        {(hasFetchFailed || hasMigrationFailed) && (
          <>
            <EuiCallOut
              color="danger"
              iconType="warning"
              data-test-subj={
                hasFetchFailed ? 'fetchFailedCallout' : 'dataStreamMigrationFailedCallout'
              }
              title={
                hasFetchFailed ? (
                  <FormattedMessage
                    id="xpack.upgradeAssistant.dataStream.migration.flyout.checklistStep.fetchFailedCalloutTitle"
                    defaultMessage="Migration status not available"
                  />
                ) : (
                  <FormattedMessage
                    id="xpack.upgradeAssistant.dataStream.migration.flyout.checklistStep.migrationFailedCalloutTitle"
                    defaultMessage="{resolutionType, select, reindex {Reindexing} readonly {Marking as read-only} other {Migration}} error"
                    values={{ resolutionType }}
                  />
                )
              }
            >
              {migrationState.errorMessage}
            </EuiCallOut>
            <EuiSpacer />
          </>
        )}

        <EuiText>
          <p>
            <FormattedMessage
              defaultMessage="Reindexing is performed in the background. You can return to the Upgrade Assistant to view progress."
              id="xpack.upgradeAssistant.dataStream.migration.flyout.checklistStep.readonlyCallout.backgroundResumeDetail"
            />
          </p>
        </EuiText>
        <EuiSpacer />
        <MigrationProgress migrationState={migrationState} />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="cross"
              onClick={closeFlyout}
              flush="left"
              data-test-subj="closeDataStreamReindexingButton"
            >
              <FormattedMessage
                id="xpack.upgradeAssistant.dataStream.migration.flyout.checklistStep.closeButtonLabel"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s">
              {shouldShowCancelButton && (
                <EuiFlexItem grow={false}>
                  <EuiButton
                    color={'accent'}
                    iconType={'pause'}
                    onClick={cancelAction}
                    disabled={!hasRequiredPrivileges}
                    data-test-subj="cancelDataStreamMigrationButton"
                  >
                    <FormattedMessage
                      id="xpack.upgradeAssistant.dataStream.migration.flyout.checklistStep.cancelMigrationButtonLabel"
                      defaultMessage="Cancel {resolutionType, select, reindex {reindexing} readonly {marking as read-only} other {migration}}"
                      values={{ resolutionType }}
                    />
                  </EuiButton>
                </EuiFlexItem>
              )}

              {showMainButton && (
                <EuiFlexItem grow={false}>
                  <EuiButton
                    fill
                    color={status === DataStreamMigrationStatus.inProgress ? 'primary' : 'warning'}
                    iconType={
                      status === DataStreamMigrationStatus.inProgress ? undefined : 'refresh'
                    }
                    onClick={executeAction}
                    isLoading={loading}
                    disabled={loading || !hasRequiredPrivileges}
                    data-test-subj="startDataStreamMigrationButton"
                  >
                    {getPrimaryButtonLabel(status)}
                  </EuiButton>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </Fragment>
  );
};
