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

import { DataStreamMetadata, ReindexStatus } from '../../../../../../../../../common/types';
import { LoadingState } from '../../../../../../types';
import type { ReindexState } from '../../../use_reindex_state';
import { useAppContext } from '../../../../../../../app_context';
import { DurationClarificationCallOut } from './warnings_callout';

const buttonLabel = (status?: ReindexStatus) => {
  switch (status) {
    case ReindexStatus.failed:
      return (
        <FormattedMessage
          id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexButton.tryAgainLabel"
          defaultMessage="Try again"
        />
      );
    case ReindexStatus.inProgress:
      return (
        <FormattedMessage
          id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexButton.reindexingLabel"
          defaultMessage="Reindexing…"
        />
      );
    case ReindexStatus.paused:
      return (
        <FormattedMessage
          id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexButton.resumeLabel"
          defaultMessage="Resume reindexing"
        />
      );
    case ReindexStatus.cancelled:
      return (
        <FormattedMessage
          id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexButton.restartLabel"
          defaultMessage="Restart reindexing"
        />
      );
    default:
      return (
        <FormattedMessage
          id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexButton.runReindexLabel"
          defaultMessage="Reindex"
        />
      );
  }
};

/**
 * Displays a flyout that shows the current reindexing status for a given index.
 */

export const DataStreamDetailsFlyoutStep: React.FunctionComponent<{
  closeFlyout: () => void;
  reindexState: ReindexState;
  startReindex: () => void;
  cancelReindex: () => void;
  lastIndexCreationDateFormatted: string;
  meta: DataStreamMetadata;
}> = ({
  closeFlyout,
  reindexState,
  startReindex,
  cancelReindex,
  lastIndexCreationDateFormatted,
  meta,
}) => {
  const {
    services: {
      api,
      core: { docLinks },
    },
  } = useAppContext();

  const { loadingState, status, hasRequiredPrivileges } = reindexState;
  console.log('reindexState::', reindexState)
  const loading = loadingState === LoadingState.Loading || status === ReindexStatus.inProgress;
  const isCompleted = status === ReindexStatus.completed;
  const hasFetchFailed = status === ReindexStatus.fetchFailed;
  const hasReindexingFailed = status === ReindexStatus.failed;

  const { data: nodes } = api.useLoadNodeDiskSpace();

  meta;
  return (
    <Fragment>
      <EuiFlyoutBody>
        <DurationClarificationCallOut formattedDate={lastIndexCreationDateFormatted} />
        <EuiSpacer size="m" />

        {hasRequiredPrivileges === false && (
          <Fragment>
            <EuiSpacer />
            <EuiCallOut
              title={
                <FormattedMessage
                  id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.insufficientPrivilegeCallout.calloutTitle"
                  defaultMessage="You do not have sufficient privileges to reindex this index"
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
                  id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.lowDiskSpaceCalloutTitle"
                  defaultMessage="Nodes with low disk space"
                />
              }
            >
              <>
                <FormattedMessage
                  id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.lowDiskSpaceCalloutDescription"
                  defaultMessage="Disk usage has exceeded the low watermark, which may prevent reindexing. The following nodes are impacted:"
                />

                <EuiSpacer size="s" />

                <ul>
                  {nodes.map(({ nodeName, available, nodeId }) => (
                    <li key={nodeId} data-test-subj="impactedNodeListItem">
                      <FormattedMessage
                        id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.lowDiskSpaceUsedText"
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

        {(hasFetchFailed || hasReindexingFailed) && (
          <>
            <EuiCallOut
              color="danger"
              iconType="warning"
              data-test-subj={hasFetchFailed ? 'fetchFailedCallout' : 'reindexingFailedCallout'}
              title={
                hasFetchFailed ? (
                  <FormattedMessage
                    id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.fetchFailedCalloutTitle"
                    defaultMessage="Reindex status not available"
                  />
                ) : (
                  <FormattedMessage
                    id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingFailedCalloutTitle"
                    defaultMessage="Reindexing error"
                  />
                )
              }
            >
              {reindexState.errorMessage}
            </EuiCallOut>
            <EuiSpacer />
          </>
        )}

        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexDescription"
              defaultMessage="You have {backingIndicesCount} backing indices on this data stream that were created in ES 7.x and will not be compatible with next version."
              values={{
                backingIndicesCount: meta.dataStreamDocCount,
              }}
            />
          </p>
          <p>
            <FormattedMessage
              id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexDescription"
              defaultMessage="{totalBackingIndices} total backing indices, and {totalBackingIndicesRequireingUpgrade} requires upgrade."
              values={{
                totalBackingIndices: 2,
                totalBackingIndicesRequireingUpgrade: 1,
              }}
            />
          </p>
          <ul>
            <li>
              If you don’t need to update historical data, mark as read-only. You can reindex
              post-upgrade if updates are needed.
            </li>
            <li>
              Reindex
              <ul>
                <li>The current write index will be rolled over and reindexed.</li>
                <li>Additional backing indices will be reindexed and remain editable.</li>
              </ul>
            </li>
          </ul>
          <p>
            If you no longer need this data, you can also proceed by deleting these indices.{' '}
            <EuiLink>Go to index management</EuiLink>
          </p>
        </EuiText>
        <EuiSpacer />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="cross" onClick={closeFlyout} flush="left">
              <FormattedMessage
                id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.closeButtonLabel"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s">
              {!hasFetchFailed && !isCompleted && hasRequiredPrivileges && (
                <EuiFlexItem grow={false}>
                  <EuiButton
                    color={status === ReindexStatus.paused ? 'warning' : 'primary'}
                    iconType={status === ReindexStatus.paused ? 'play' : undefined}
                    onClick={startReindex}
                    isLoading={loading}
                    disabled={loading || !hasRequiredPrivileges}
                    data-test-subj="startReindexingButton"
                  >
                    {buttonLabel(status)}
                  </EuiButton>
                </EuiFlexItem>
              )}
              {!hasFetchFailed && !isCompleted && hasRequiredPrivileges && (
                <EuiFlexItem grow={false}>
                  <EuiButton
                    fill
                    color={status === ReindexStatus.paused ? 'warning' : 'primary'}
                    iconType={status === ReindexStatus.paused ? 'play' : undefined}
                    onClick={() => {}}
                    isLoading={loading}
                    disabled={loading || !hasRequiredPrivileges}
                    data-test-subj="startReindexingButton"
                  >
                    Make all read only
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
