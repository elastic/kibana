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

import { DataStreamReindexStatus } from '../../../../../../../../../common/types';
import { LoadingState } from '../../../../../../types';
import type { ReindexState } from '../../../use_reindex_state';
import { ReindexProgress } from './progress';
import { useAppContext } from '../../../../../../../app_context';
import { getPrimaryButtonLabel } from '../../messages';

/**
 * Displays a flyout that shows the current reindexing status for a given index.
 */
export const ChecklistFlyoutStep: React.FunctionComponent<{
  closeFlyout: () => void;
  reindexState: ReindexState;
  startReindex: () => void;
  cancelReindex: () => void;
}> = ({ closeFlyout, reindexState, startReindex, cancelReindex }) => {
  const {
    services: { api },
  } = useAppContext();

  const { loadingState, status, hasRequiredPrivileges } = reindexState;
  const loading =
    loadingState === LoadingState.Loading || status === DataStreamReindexStatus.inProgress;
  const isCompleted = status === DataStreamReindexStatus.completed;
  const hasFetchFailed = status === DataStreamReindexStatus.fetchFailed;
  const hasReindexingFailed = status === DataStreamReindexStatus.failed;

  const { data: nodes } = api.useLoadNodeDiskSpace();

  const showMainButton = !hasFetchFailed && !isCompleted && hasRequiredPrivileges;
  const shouldShowCancelButton = showMainButton && status === DataStreamReindexStatus.inProgress;

  return (
    <Fragment>
      <EuiFlyoutBody>
        {hasRequiredPrivileges === false && (
          <Fragment>
            <EuiSpacer />
            <EuiCallOut
              title={
                <FormattedMessage
                  id="xpack.upgradeAssistant.dataStream.reindexing.flyout.checklistStep.insufficientPrivilegeCallout.calloutTitle"
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
                  id="xpack.upgradeAssistant.dataStream.reindexing.flyout.checklistStep.lowDiskSpaceCalloutTitle"
                  defaultMessage="Nodes with low disk space"
                />
              }
            >
              <>
                <FormattedMessage
                  id="xpack.upgradeAssistant.dataStream.reindexing.flyout.checklistStep.lowDiskSpaceCalloutDescription"
                  defaultMessage="Disk usage has exceeded the low watermark, which may prevent reindexing. The following nodes are impacted:"
                />

                <EuiSpacer size="s" />

                <ul>
                  {nodes.map(({ nodeName, available, nodeId }) => (
                    <li key={nodeId} data-test-subj="impactedNodeListItem">
                      <FormattedMessage
                        id="xpack.upgradeAssistant.dataStream.reindexing.flyout.checklistStep.lowDiskSpaceUsedText"
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
                    id="xpack.upgradeAssistant.dataStream.reindexing.flyout.checklistStep.fetchFailedCalloutTitle"
                    defaultMessage="Reindex status not available"
                  />
                ) : (
                  <FormattedMessage
                    id="xpack.upgradeAssistant.dataStream.reindexing.flyout.checklistStep.reindexingFailedCalloutTitle"
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
              defaultMessage="Reindexing is performed in the background. You can return to the Upgrade Assistant to view progress."
              id="xpack.upgradeAssistant.dataStream.reindexing.flyout.checklistStep.readonlyCallout.backgroundResumeDetail"
            />
          </p>
        </EuiText>
        <EuiSpacer />
        <ReindexProgress reindexState={reindexState} />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="cross" onClick={closeFlyout} flush="left">
              <FormattedMessage
                id="xpack.upgradeAssistant.dataStream.reindexing.flyout.checklistStep.closeButtonLabel"
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
                    onClick={cancelReindex}
                    disabled={!hasRequiredPrivileges}
                    data-test-subj="cancelDataStreamReindexingButton"
                  >
                    <FormattedMessage
                      id="xpack.upgradeAssistant.dataStream.reindexing.flyout.checklistStep.cancelReindexButtonLabel"
                      defaultMessage="Cancel reindexing"
                    />
                  </EuiButton>
                </EuiFlexItem>
              )}

              {showMainButton && (
                <EuiFlexItem grow={false}>
                  <EuiButton
                    fill
                    color={status === DataStreamReindexStatus.inProgress ? 'primary' : 'warning'}
                    iconType={status === DataStreamReindexStatus.inProgress ? undefined : 'refresh'}
                    onClick={startReindex}
                    isLoading={loading}
                    disabled={loading || !hasRequiredPrivileges}
                    data-test-subj="startDataStreamReindexingButton"
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
