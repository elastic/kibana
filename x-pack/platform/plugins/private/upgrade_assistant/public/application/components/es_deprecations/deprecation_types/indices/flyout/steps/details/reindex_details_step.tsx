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
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiLink,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

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
      core: { docLinks, http },
    },
  } = useAppContext();

  const { loadingState, status: reindexStatus, hasRequiredPrivileges, meta } = reindexState;
  const { status: updateIndexStatus } = updateIndexState;
  const { indexName } = meta;
  const loading = loadingState === LoadingState.Loading;
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

        {meta.isFrozen && <FrozenCallOut />}

        <EuiText>
          {meta.isReadonly && (
            <Fragment>
              <p>
                <FormattedMessage
                  id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.readonlyCompatibleIndexText"
                  defaultMessage="This index was created in ES 7.x. It has been marked as read-only, which enables compatibility with the next major version."
                />
              </p>
              <p>
                <FormattedMessage
                  id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.reindexText"
                  defaultMessage="The reindex operation allows transforming an index into a new, compatible one. It will copy all of the existing documents into a new index and remove the old one. Depending on size and resources, reindexing may take extended time and your data will be in a read-only state until the job has completed."
                />
              </p>
            </Fragment>
          )}
          {!meta.isReadonly && (
            <Fragment>
              <p>
                <FormattedMessage
                  id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.notCompatibleIndexText"
                  defaultMessage="This index was created in ES 7.x and it is not compatible with the next major version. Choose one of the following options:"
                />
              </p>
              <EuiDescriptionList
                rowGutterSize="m"
                listItems={[
                  {
                    title: 'Option 1: Reindex data',
                    description: (
                      <EuiText size="m">
                        <FormattedMessage
                          id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.reindexText"
                          defaultMessage="The reindex operation allows transforming an index into a new, compatible one. It will copy all of the existing documents into a new index and remove the old one. Depending on size and resources, reindexing may take extended time and your data will be in a read-only state until the job has completed."
                        />
                      </EuiText>
                    ),
                  },
                  {
                    title: 'Option 2: Mark as read-only',
                    description: (
                      <EuiText size="m">
                        <FormattedMessage
                          id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.readOnlyText"
                          defaultMessage="Old indices can maintain compatibility with the next major version if they are turned into read-only mode. If you no longer need to update documents in this index (or add new ones), you might want to convert it to a read-only index. {docsLink}"
                          values={{
                            docsLink: (
                              <EuiLink
                                target="_blank"
                                href={docLinks.links.upgradeAssistant.indexBlocks}
                              >
                                {i18n.translate(
                                  'xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.learnMoreLinkLabel',
                                  {
                                    defaultMessage: 'Learn more',
                                  }
                                )}
                              </EuiLink>
                            ),
                          }}
                        />
                      </EuiText>
                    ),
                  },
                  {
                    title: 'Option 3: Delete this index',
                    description: (
                      <EuiText size="m">
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
                      </EuiText>
                    ),
                  },
                ]}
              />
            </Fragment>
          )}
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
              {!meta.isReadonly && !hasFetchFailed && !isCompleted && hasRequiredPrivileges && (
                <EuiFlexItem grow={false}>
                  <EuiButton
                    onClick={startReadonly}
                    disabled={loading}
                    data-test-subj="startIndexReadonlyButton"
                  >
                    <FormattedMessage
                      id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.startIndexReadonlyButton"
                      defaultMessage="Mark as read-only"
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
                    disabled={loading}
                    data-test-subj="startReindexingButton"
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
