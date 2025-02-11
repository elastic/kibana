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

import { ReindexStatus } from '../../../../../../../../../common/types';
import { LoadingState } from '../../../../../../types';
import type { ReindexState } from '../../../use_reindex';
import { useAppContext } from '../../../../../../../app_context';
import { getReindexButtonLabel } from './messages';
import { FrozenCallOut } from '../frozen_callout';
import type { UpdateIndexState } from '../../../use_update_index';
import { FetchFailedCallOut } from '../fetch_failed_callout';
import { ReindexingFailedCallOut } from '../reindexing_failed_callout';

/**
 * Displays a flyout that shows the details / corrective action for a "reindex" deprecation for a given index.
 */
export const UnfreezeDetailsFlyoutStep: React.FunctionComponent<{
  closeFlyout: () => void;
  reindexState: ReindexState;
  updateIndexState: UpdateIndexState;
  startReindex: () => void;
  unfreeze: () => void;
}> = ({ closeFlyout, reindexState, updateIndexState, startReindex, unfreeze }) => {
  const {
    services: {
      api,
      core: { http },
    },
  } = useAppContext();

  const { loadingState, status: reindexStatus, hasRequiredPrivileges, meta } = reindexState;
  const { status: updateIndexStatus } = updateIndexState;
  const { indexName } = meta;
  const loading = loadingState === LoadingState.Loading;
  const inProgress =
    reindexStatus === ReindexStatus.inProgress || updateIndexStatus === 'inProgress';
  const isCompleted = reindexStatus === ReindexStatus.completed || updateIndexStatus === 'complete';
  const hasFetchFailed = reindexStatus === ReindexStatus.fetchFailed;
  const hasReindexingFailed = reindexStatus === ReindexStatus.failed;

  const { data: nodes } = api.useLoadNodeDiskSpace();

  return (
    <Fragment>
      <EuiFlyoutBody>
        {hasRequiredPrivileges === false && (
          <Fragment>
            <EuiSpacer />
            <EuiCallOut
              title={
                <FormattedMessage
                  id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.insufficientPrivilegeCallout.calloutTitle"
                  defaultMessage="You do not have sufficient privileges to reindex this index."
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
                  id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.lowDiskSpaceCalloutTitle"
                  defaultMessage="Nodes with low disk space"
                />
              }
            >
              <>
                <FormattedMessage
                  id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.lowDiskSpaceCalloutDescription"
                  defaultMessage="Disk usage has exceeded the low watermark, which may prevent reindexing. The following nodes are impacted:"
                />

                <EuiSpacer size="s" />

                <ul>
                  {nodes.map(({ nodeName, available, nodeId }) => (
                    <li key={nodeId} data-test-subj="impactedNodeListItem">
                      <FormattedMessage
                        id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.lowDiskSpaceUsedText"
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

        {hasFetchFailed && <FetchFailedCallOut errorMessage={reindexState.errorMessage!} />}
        {!hasFetchFailed && hasReindexingFailed && (
          <ReindexingFailedCallOut errorMessage={reindexState.errorMessage!} />
        )}

        {reindexState.meta.isFrozen && <FrozenCallOut />}
        <EuiText>
          {reindexState.meta.isReadonly && (
            <p>
              <FormattedMessage
                id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.readonlyCompatibleIndexText"
                defaultMessage="This index was created in ES 7.x. It has been marked as read-only, which enables compatibility with the next major version."
              />
            </p>
          )}
          <ul>
            <FormattedMessage
              id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.mustUnfreezeText"
              tagName="li"
              defaultMessage="In order to address this issue, you must unfreeze this index and keep it as read-only. This will enable compatibility with the next major version."
            />
            <FormattedMessage
              id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.canReindexText"
              tagName="li"
              defaultMessage="Alternatively, you might opt for reindexing this index. The reindex operation allows transforming an index into a new, compatible one. It will copy all of the existing documents into a new index and remove the old one. Depending on size and resources, reindexing may take extended time and your data will be in a read-only state until the job has completed."
            />
          </ul>
          <p>
            <FormattedMessage
              id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.deleteText"
              defaultMessage="If you no longer need this data, you can also proceed by deleting this index. {indexManagementLinkHtml}"
              values={{
                indexManagementLinkHtml: (
                  <EuiLink
                    href={`${http.basePath.prepend(
                      `/app/management/data/index_management/indices/index_details?indexName=${indexName}`
                    )}`}
                  >
                    <FormattedMessage
                      id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.indexMgmtLink"
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
                id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.closeButtonLabel"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s">
              {!hasFetchFailed && !isCompleted && hasRequiredPrivileges && (
                <EuiFlexItem grow={false}>
                  <EuiButton
                    color={reindexStatus === ReindexStatus.cancelled ? 'warning' : 'primary'}
                    iconType={reindexStatus === ReindexStatus.cancelled ? 'play' : undefined}
                    onClick={startReindex}
                    isLoading={loading}
                    disabled={loading || inProgress}
                    data-test-subj="startIndexReindexingButton"
                  >
                    {getReindexButtonLabel(reindexStatus)}
                  </EuiButton>
                </EuiFlexItem>
              )}
              {!hasFetchFailed && !isCompleted && hasRequiredPrivileges && (
                <EuiFlexItem grow={false}>
                  <EuiButton
                    fill
                    onClick={unfreeze}
                    disabled={loading || inProgress}
                    data-test-subj="startIndexReadonlyButton"
                  >
                    <FormattedMessage
                      id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.unfreezeIndexButton"
                      defaultMessage="Unfreeze"
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
