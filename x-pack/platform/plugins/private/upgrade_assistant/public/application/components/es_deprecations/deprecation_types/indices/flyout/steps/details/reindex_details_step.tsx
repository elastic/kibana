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
import type { UpdateIndexState } from '../../../use_readonly';

/**
 * Displays a flyout that shows the details / corrective action for a "reindex" deprecation for a given index.
 */
export const ReindexDetailsFlyoutStep: React.FunctionComponent<{
  reindexState: ReindexState;
  updateIndexState: UpdateIndexState;
  startReindex: () => void;
  startReadonly: () => void;
  closeFlyout: () => void;
}> = ({ reindexState, updateIndexState, startReindex, startReadonly, closeFlyout }) => {
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
                  id="xpack.upgradeAssistant.indices.flyout.detailsStep.insufficientPrivilegeCallout.calloutTitle"
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
                  id="xpack.upgradeAssistant.indices.flyout.detailsStep.lowDiskSpaceCalloutTitle"
                  defaultMessage="Nodes with low disk space"
                />
              }
            >
              <>
                <FormattedMessage
                  id="xpack.upgradeAssistant.indices.flyout.detailsStep.lowDiskSpaceCalloutDescription"
                  defaultMessage="Disk usage has exceeded the low watermark, which may prevent reindexing. The following nodes are impacted:"
                />

                <EuiSpacer size="s" />

                <ul>
                  {nodes.map(({ nodeName, available, nodeId }) => (
                    <li key={nodeId} data-test-subj="impactedNodeListItem">
                      <FormattedMessage
                        id="xpack.upgradeAssistant.index.flyout.detailsStep.lowDiskSpaceUsedText"
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
                    id="xpack.upgradeAssistant.index.flyout.detailsStep.fetchFailedCalloutTitle"
                    defaultMessage="Data stream reindex status not available"
                  />
                ) : (
                  <FormattedMessage
                    id="xpack.upgradeAssistant.index.flyout.detailsStep.reindexingFailedCalloutTitle"
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

        {reindexState.meta.isFrozen && <FrozenCallOut />}
        <EuiText>
          {reindexState.meta.isReadonly && (
            <Fragment>
              <p>
                <FormattedMessage
                  id="xpack.upgradeAssistant.index.flyout.detailsStep.readonlyCompatibleIndexText"
                  defaultMessage="This index was created in ES 7.x. The index has been flagged as read-only, which allows for N-2 compatibility with the next major version."
                />
              </p>
              <p>
                <FormattedMessage
                  id="xpack.upgradeAssistant.index.flyout.detailsStep.reindexText"
                  defaultMessage="The reindex operation allows transforming an index into a new, compatible one. It will copy all of the existing documents into a new index and remove the old one. Depending on size and resources, reindexing may take extended time and your data will be in a read-only state until the job has completed."
                />
              </p>
            </Fragment>
          )}
          {!reindexState.meta.isReadonly && (
            <Fragment>
              <p>
                <FormattedMessage
                  id="xpack.upgradeAssistant.index.flyout.detailsStep.notCompatibleIndexText"
                  defaultMessage="This index was created in ES 7.x and it is not compatible with the next major version. You must address this issue before upgrading."
                />
              </p>
              <ul>
                <FormattedMessage
                  id="xpack.upgradeAssistant.index.flyout.detailsStep.reindexText"
                  tagName="li"
                  defaultMessage="The reindex operation allows transforming an index into a new, compatible one. It will copy all of the existing documents into a new index and remove the old one. Depending on size and resources, reindexing may take extended time and your data will be in a read-only state until the job has completed."
                />
                <FormattedMessage
                  id="xpack.upgradeAssistant.index.flyout.detailsStep.readOnlyText"
                  tagName="li"
                  defaultMessage="Alternatively, old indices can maintain compatibility with the next major version if they are turned into read-only mode. If you no longer need to update documents in this index (or add new ones), you might want to convert it to a read-only index."
                />
              </ul>
            </Fragment>
          )}
          <p>
            <FormattedMessage
              id="xpack.upgradeAssistant.index.flyout.detailsStep.deleteText"
              defaultMessage="If you no longer need this data, you can also proceed by deleting this index. {indexManagementLinkHtml}"
              values={{
                indexManagementLinkHtml: (
                  <EuiLink
                    href={`${http.basePath.prepend(
                      `/app/management/data/index_management/indices/index_details?indexName=${indexName}`
                    )}`}
                  >
                    <FormattedMessage
                      id="xpack.upgradeAssistant.index.flyout.detailsStep.indexMgmtLink"
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
                id="xpack.upgradeAssistant.index.flyout.detailsStep.closeButtonLabel"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s">
              {!reindexState.meta.isReadonly &&
                !hasFetchFailed &&
                !isCompleted &&
                hasRequiredPrivileges && (
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      onClick={startReadonly}
                      disabled={loading || inProgress}
                      data-test-subj="startIndexReadonlyButton"
                    >
                      <FormattedMessage
                        id="xpack.upgradeAssistant.index.flyout.detailsStep.startIndexReadonlyButton"
                        defaultMessage="Mark as read only"
                      />
                    </EuiButton>
                  </EuiFlexItem>
                )}
              {!hasFetchFailed && !isCompleted && hasRequiredPrivileges && (
                <EuiFlexItem grow={false}>
                  <EuiButton
                    fill
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
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </Fragment>
  );
};
