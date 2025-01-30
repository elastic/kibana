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
  DataStreamReindexStatus,
} from '../../../../../../../../../common/types';
import { LoadingState } from '../../../../../../types';
import type { ReindexState } from '../../../use_reindex_state';
import { useAppContext } from '../../../../../../../app_context';
import { DurationClarificationCallOut } from './warnings_callout';
import { getPrimaryButtonLabel } from '../../messages';

/**
 * Displays a flyout that shows the current reindexing status for a given index.
 */

export const DataStreamDetailsFlyoutStep: React.FunctionComponent<{
  closeFlyout: () => void;
  reindexState: ReindexState;
  startReindex: () => void;
  lastIndexCreationDateFormatted: string;
  meta: DataStreamMetadata;
}> = ({ closeFlyout, reindexState, startReindex, lastIndexCreationDateFormatted, meta }) => {
  const {
    services: {
      api,
      core: { http },
    },
  } = useAppContext();

  const { loadingState, status, hasRequiredPrivileges } = reindexState;
  const loading =
    loadingState === LoadingState.Loading || status === DataStreamReindexStatus.inProgress;
  const isCompleted = status === DataStreamReindexStatus.completed;
  const hasFetchFailed = status === DataStreamReindexStatus.fetchFailed;
  const hasReindexingFailed = status === DataStreamReindexStatus.failed;

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
                  id="xpack.upgradeAssistant.dataStream.reindexing.flyout.detailsStep.insufficientPrivilegeCallout.calloutTitle"
                  defaultMessage="You do not have sufficient privileges to reindex this data stream."
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
                  id="xpack.upgradeAssistant.dataStream.reindexing.flyout.detailsStep.lowDiskSpaceCalloutTitle"
                  defaultMessage="Nodes with low disk space"
                />
              }
            >
              <>
                <FormattedMessage
                  id="xpack.upgradeAssistant.dataStream.reindexing.flyout.detailsStep.lowDiskSpaceCalloutDescription"
                  defaultMessage="Disk usage has exceeded the low watermark, which may prevent reindexing. The following nodes are impacted:"
                />

                <EuiSpacer size="s" />

                <ul>
                  {nodes.map(({ nodeName, available, nodeId }) => (
                    <li key={nodeId} data-test-subj="impactedNodeListItem">
                      <FormattedMessage
                        id="xpack.upgradeAssistant.dataStream.reindexing.flyout.detailsStep.lowDiskSpaceUsedText"
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
                    id="xpack.upgradeAssistant.dataStream.reindexing.flyout.detailsStep.fetchFailedCalloutTitle"
                    defaultMessage="Data stream reindex status not available"
                  />
                ) : (
                  <FormattedMessage
                    id="xpack.upgradeAssistant.dataStream.reindexing.flyout.detailsStep.reindexingFailedCalloutTitle"
                    defaultMessage="Data stream reindexing error"
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
              id="xpack.upgradeAssistant.dataStream.reindexing.flyout.detailsStep.notCompatibleIndicesText"
              defaultMessage="You have {backingIndicesCount} backing indices on this data stream that were created in ES 7.x and will not be compatible with next version."
              values={{
                backingIndicesCount: meta.indicesRequiringUpgradeCount,
              }}
            />
          </p>
          <p>
            <FormattedMessage
              id="xpack.upgradeAssistant.dataStream.reindexing.flyout.detailsStep.requiredUpgradeText"
              defaultMessage="{allBackingIndices} total backing indices, and {backingIndicesRequireingUpgrade} requires upgrade."
              values={{
                allBackingIndices: meta.allIndicesCount,
                backingIndicesRequireingUpgrade: meta.indicesRequiringUpgradeCount,
              }}
            />
          </p>
          <ul>
            <FormattedMessage
              id="xpack.upgradeAssistant.dataStream.reindexing.flyout.detailsStep.readOnlyText"
              tagName="li"
              defaultMessage="If you do not need to update historical data, mark as read-only. You can reindex post-upgrade if updates are needed."
            />
            <li>
              <FormattedMessage
                id="xpack.upgradeAssistant.dataStream.reindexing.flyout.detailsStep.reindexOptionListTitle"
                defaultMessage="Reindex"
              />
              <ul>
                <FormattedMessage
                  tagName="li"
                  id="xpack.upgradeAssistant.dataStream.reindexing.flyout.detailsStep.reindexOption.rolledOverIndex"
                  defaultMessage="The current write index will be rolled over and reindexed."
                />
                <FormattedMessage
                  tagName="li"
                  id="xpack.upgradeAssistant.dataStream.reindexing.flyout.detailsStep.reindexOption.additionalIndices"
                  defaultMessage="Additional backing indices will be reindexed and remain editable."
                />
              </ul>
            </li>
          </ul>
          <p>
            <FormattedMessage
              id="xpack.upgradeAssistant.dataStream.reindexing.flyout.detailsStep.reindexDescription"
              defaultMessage="If you no longer need this data, you can also proceed by deleting these indices. {indexManagementLinkHtml}"
              values={{
                indexManagementLinkHtml: (
                  <EuiLink
                    href={`${http.basePath.prepend(
                      '/app/management/data/index_management/indices'
                    )}`}
                  >
                    <FormattedMessage
                      id="xpack.upgradeAssistant.dataStream.reindexing.flyout.detailsStep.indexMgmtLink"
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
                id="xpack.upgradeAssistant.dataStream.reindexing.flyout.detailsStep.closeButtonLabel"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s">
              {!hasFetchFailed && !isCompleted && hasRequiredPrivileges && (
                <EuiFlexItem grow={false}>
                  <EuiButton
                    color={status === DataStreamReindexStatus.cancelled ? 'warning' : 'primary'}
                    iconType={status === DataStreamReindexStatus.cancelled ? 'play' : undefined}
                    onClick={startReindex}
                    isLoading={loading}
                    disabled={loading || !hasRequiredPrivileges}
                    data-test-subj="startReindexingButton"
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
