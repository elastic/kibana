/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalFooter,
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
export const ChecklistModalStep: React.FunctionComponent<{
  closeModal: () => void;
  migrationState: MigrationState;
  executeAction: () => void;
  cancelAction: () => void;
  dataStreamName?: string;
}> = ({ closeModal, migrationState, executeAction, cancelAction, dataStreamName }) => {
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
    <>
      <EuiModalHeader>
        <EuiModalHeaderTitle data-test-subj="readonlyDataStreamModalTitle" size="m">
          <FormattedMessage
            id="xpack.upgradeAssistant.dataStream.modal.checktlistStep.readonly.title"
            defaultMessage="Setting data stream to read-only"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody data-test-subj="dataStreamMigrationChecklistModal">
        {!hasRequiredPrivileges && <NoPrivilegesCallout />}
        {nodes && nodes.length > 0 && <NodesLowSpaceCallOut nodes={nodes} />}

        {(hasFetchFailed || hasMigrationFailed) && (
          <FetchFailedCallout
            hasFetchFailed={hasFetchFailed}
            errorMessage={migrationState.errorMessage}
          />
        )}

        <EuiSpacer />
        <MigrationProgress migrationState={migrationState} dataStreamName={dataStreamName} />
      </EuiModalBody>
      <EuiModalFooter>
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
          <EuiButtonEmpty
            onClick={closeModal}
            flush="left"
            data-test-subj="closeDataStreamReindexingButton"
          >
            <FormattedMessage
              id="xpack.upgradeAssistant.dataStream.migration.modal.checklistStep.closeButtonLabel"
              defaultMessage="Close"
            />
          </EuiButtonEmpty>

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
                  id="xpack.upgradeAssistant.dataStream.migration.modal.checklistStep.cancelMigrationButtonLabel"
                  defaultMessage="Cancel setting to read-only"
                />
              </EuiButton>
            </EuiFlexItem>
          )}

          {showMainButton && (
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                color={'primary'}
                iconType={status === DataStreamMigrationStatus.inProgress ? undefined : 'refresh'}
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
      </EuiModalFooter>
    </>
  );
};
