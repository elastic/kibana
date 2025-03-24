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
  EuiLink,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  DataStreamMetadata,
  DataStreamMigrationStatus,
  DataStreamResolutionType,
  DataStreamsAction,
} from '../../../../../../../../../common/types';
import { LoadingState } from '../../../../../../types';
import type { MigrationState } from '../../../use_migration_state';
import { useAppContext } from '../../../../../../../app_context';
import { DurationClarificationCallOut } from './warnings_callout';

/**
 * Displays a flyout that shows the current reindexing status for a given index.
 */

export const DataStreamDetailsFlyoutStep: React.FunctionComponent<{
  closeFlyout: () => void;
  migrationState: MigrationState;
  correctiveAction: DataStreamsAction;
  initAction: (resolutionType: DataStreamResolutionType) => void;
  lastIndexCreationDateFormatted: string;
  meta: DataStreamMetadata;
}> = ({
  closeFlyout,
  migrationState,
  initAction,
  lastIndexCreationDateFormatted,
  correctiveAction,
  meta,
}) => {
  const {
    services: {
      api,
      core: { http },
    },
  } = useAppContext();

  const { loadingState, status, hasRequiredPrivileges } = migrationState;
  const loading =
    loadingState === LoadingState.Loading || status === DataStreamMigrationStatus.inProgress;
  const isCompleted = status === DataStreamMigrationStatus.completed;
  const hasFetchFailed = status === DataStreamMigrationStatus.fetchFailed;
  const hasMigrationFailed = status === DataStreamMigrationStatus.failed;

  const readOnlyExcluded = correctiveAction.metadata.excludedActions?.includes('readOnly');
  const reindexExcluded = correctiveAction.metadata.excludedActions?.includes('reindex');

  const { data: nodes } = api.useLoadNodeDiskSpace();

  return (
    <Fragment>
      <EuiFlyoutBody>
        <DurationClarificationCallOut
          formattedDate={lastIndexCreationDateFormatted}
          learnMoreUrl={meta.documentationUrl}
        />
        <EuiSpacer size="m" />

        {hasRequiredPrivileges === false && (
          <Fragment>
            <EuiSpacer />
            <EuiCallOut
              title={
                <FormattedMessage
                  id="xpack.upgradeAssistant.dataStream.migration.flyout.detailsStep.insufficientPrivilegeCallout.calloutTitle"
                  defaultMessage="You do not have sufficient privileges to migrate this data stream."
                />
              }
              color="danger"
              iconType="warning"
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
                  id="xpack.upgradeAssistant.dataStream.migration.flyout.detailsStep.lowDiskSpaceCalloutTitle"
                  defaultMessage="Nodes with low disk space"
                />
              }
            >
              <>
                <FormattedMessage
                  id="xpack.upgradeAssistant.dataStream.migration.flyout.detailsStep.lowDiskSpaceCalloutDescription"
                  defaultMessage="Disk usage has exceeded the low watermark, which may prevent migration. The following nodes are impacted:"
                />

                <EuiSpacer size="s" />

                <ul>
                  {nodes.map(({ nodeName, available, nodeId }) => (
                    <li key={nodeId} data-test-subj="impactedNodeListItem">
                      <FormattedMessage
                        id="xpack.upgradeAssistant.dataStream.migration.flyout.detailsStep.lowDiskSpaceUsedText"
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
              data-test-subj={hasFetchFailed ? 'fetchFailedCallout' : 'migrationFailedCallout'}
              title={
                hasFetchFailed ? (
                  <FormattedMessage
                    id="xpack.upgradeAssistant.dataStream.migration.flyout.detailsStep.fetchFailedCalloutTitle"
                    defaultMessage="Data stream migration status not available"
                  />
                ) : (
                  <FormattedMessage
                    id="xpack.upgradeAssistant.dataStream.migration.flyout.detailsStep.migrationFailedCalloutTitle"
                    defaultMessage="Data stream migration error"
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
              id="xpack.upgradeAssistant.dataStream.migration.flyout.detailsStep.notCompatibleIndicesText"
              defaultMessage="You have {backingIndicesCount} backing indices on this data stream that were created in ES 7.x and will not be compatible with next version."
              values={{
                backingIndicesCount: meta.indicesRequiringUpgradeCount,
              }}
            />
          </p>
          <p>
            <FormattedMessage
              id="xpack.upgradeAssistant.dataStream.migration.flyout.detailsStep.requiredUpgradeText"
              defaultMessage="{allBackingIndices} total backing indices, and {backingIndicesRequireingUpgrade} requires upgrade."
              values={{
                allBackingIndices: meta.allIndicesCount,
                backingIndicesRequireingUpgrade: meta.indicesRequiringUpgradeCount,
              }}
            />
          </p>
          <ul>
            {!readOnlyExcluded && (
              <li>
                <FormattedMessage
                  id="xpack.upgradeAssistant.dataStream.migration.flyout.detailsStep.readOnlyText"
                  defaultMessage="If you do not need to update historical data, mark as read-only. You can reindex post-upgrade if updates are needed."
                />
              </li>
            )}
            {!reindexExcluded && (
              <li>
                <FormattedMessage
                  id="xpack.upgradeAssistant.dataStream.migration.flyout.detailsStep.reindexOptionListTitle"
                  defaultMessage="Reindex"
                />
                <ul>
                  <FormattedMessage
                    tagName="li"
                    id="xpack.upgradeAssistant.dataStream.migration.flyout.detailsStep.reindexOption.rolledOverIndex"
                    defaultMessage="The current write index will be rolled over and reindexed."
                  />
                  <FormattedMessage
                    tagName="li"
                    id="xpack.upgradeAssistant.dataStream.migration.flyout.detailsStep.reindexOption.additionalIndices"
                    defaultMessage="Additional backing indices will be reindexed and remain editable."
                  />
                </ul>
              </li>
            )}
          </ul>
          <p>
            <FormattedMessage
              id="xpack.upgradeAssistant.dataStream.migration.flyout.detailsStep.migrationDescription"
              defaultMessage="If you no longer need this data, you can also proceed by deleting these indices. {indexManagementLinkHtml}"
              values={{
                indexManagementLinkHtml: (
                  <EuiLink
                    href={`${http.basePath.prepend(
                      '/app/management/data/index_management/indices'
                    )}`}
                  >
                    <FormattedMessage
                      id="xpack.upgradeAssistant.dataStream.migration.flyout.detailsStep.indexMgmtLink"
                      defaultMessage="Go to index management"
                    />
                  </EuiLink>
                ),
              }}
            />
          </p>
        </EuiText>
        <EuiSpacer />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="cross" onClick={closeFlyout} flush="left">
              <FormattedMessage
                id="xpack.upgradeAssistant.dataStream.migration.flyout.detailsStep.closeButtonLabel"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s">
              {!hasFetchFailed && !isCompleted && hasRequiredPrivileges && !reindexExcluded && (
                <EuiFlexItem grow={false}>
                  <EuiButton
                    color={
                      status === DataStreamMigrationStatus.cancelled
                        ? 'warning'
                        : readOnlyExcluded
                        ? 'primary'
                        : 'accent'
                    }
                    iconType={status === DataStreamMigrationStatus.cancelled ? 'play' : undefined}
                    onClick={() => initAction('reindex')}
                    isLoading={loading}
                    disabled={loading || !hasRequiredPrivileges || reindexExcluded}
                    data-test-subj="startDataStreamReindexingButton"
                  >
                    <FormattedMessage
                      id="xpack.upgradeAssistant.dataStream.migration.flyout.reindexButton.initReindexButtonLabel"
                      defaultMessage="Reindex"
                    />
                  </EuiButton>
                </EuiFlexItem>
              )}
              {!readOnlyExcluded && (
                <EuiFlexItem grow={false}>
                  <EuiButton
                    fill
                    color={'primary'}
                    onClick={() => initAction('readonly')}
                    disabled={!hasRequiredPrivileges || readOnlyExcluded}
                    data-test-subj="startDataStreamReadonlyButton"
                  >
                    <FormattedMessage
                      id="xpack.upgradeAssistant.dataStream.migration.flyout.checklistStep.initMarkReadOnlyButtonLabel"
                      defaultMessage="Mark read-only"
                    />
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
