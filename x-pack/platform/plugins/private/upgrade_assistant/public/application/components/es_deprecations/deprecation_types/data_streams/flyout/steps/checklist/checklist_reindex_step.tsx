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
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { DataStreamMigrationStatus } from '../../../../../../../../../common/types';
import { LoadingState } from '../../../../../../types';
import type { MigrationState } from '../../../use_migration_state';
import { MigrationProgress } from './progress';
import { useAppContext } from '../../../../../../../app_context';
import { getPrimaryButtonLabel } from '../../messages';
import { NodesLowSpaceCallOut } from '../../../../../common/nodes_low_disk_space';
import { FetchFailedCallout, NoPrivilegesCallout } from './callouts';

/**
 * Displays a flyout that shows the current reindexing status for a given index.
 */
export const ChecklistFlyoutStep: React.FunctionComponent<{
  closeFlyout: () => void;
  migrationState: MigrationState;
  executeAction: () => void;
  cancelAction: () => void;
  dataStreamName?: string;
}> = ({ closeFlyout, migrationState, executeAction, cancelAction, dataStreamName }) => {
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
        {!hasRequiredPrivileges && <NoPrivilegesCallout />}
        {nodes && nodes.length > 0 && <NodesLowSpaceCallOut nodes={nodes} />}

        {(hasFetchFailed || hasMigrationFailed) && (
          <FetchFailedCallout
            hasFetchFailed={hasFetchFailed}
            errorMessage={migrationState.errorMessage}
          />
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
        <MigrationProgress migrationState={migrationState} dataStreamName={dataStreamName} />
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
                      defaultMessage="Cancel reindexing"
                    />
                  </EuiButton>
                </EuiFlexItem>
              )}

              {showMainButton && (
                <EuiFlexItem grow={false}>
                  <EuiButton
                    fill
                    color={'primary'}
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
