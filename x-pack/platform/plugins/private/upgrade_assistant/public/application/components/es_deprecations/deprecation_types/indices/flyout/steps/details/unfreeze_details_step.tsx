/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';

import { i18n } from '@kbn/i18n';
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

import { ReindexStatus } from '../../../../../../../../../common/types';
import { LoadingState } from '../../../../../../types';
import type { ReindexState } from '../../../use_reindex';
import { useAppContext } from '../../../../../../../app_context';
import { getReindexButtonLabel } from './messages';
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
  const { indexName, isInDataStream } = meta;
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

        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.frozenIndexText"
              defaultMessage="This index is frozen. Frozen indices will no longer be supported after the upgrade. Choose one of the following options:"
            />
          </p>
          <EuiDescriptionList
            rowGutterSize="m"
            listItems={[
              {
                title: i18n.translate(
                  'xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.unfreeze.option1.title',
                  {
                    defaultMessage: 'Option 1: Unfreeze index',
                  }
                ),
                description: (
                  <EuiText size="m">
                    <FormattedMessage
                      id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.unfreeze.option1.description"
                      defaultMessage="Unfreeze this index and make it read-only. This ensures that the index will remain compatible with the next major version."
                    />
                  </EuiText>
                ),
              },
              /* We cannot unfreeze backing indices (that would break the related data_stream) */
              ...(!isInDataStream
                ? [
                    {
                      title: i18n.translate(
                        'xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.unfreeze.option2.title',
                        {
                          defaultMessage: 'Option 2: Reindex data',
                        }
                      ),
                      description: (
                        <EuiText size="m">
                          <FormattedMessage
                            id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.unfreeze.option2.description"
                            defaultMessage="Alternatively, you can reindex the data into a new, compatible index. All existing documents will be copied over to a new index, and the old index will be removed. Depending on the size of the index and the available resources, the reindexing operation can take some time. Your data will be in read-only mode until the reindexing has completed."
                          />
                        </EuiText>
                      ),
                    },
                  ]
                : []),
              {
                title: i18n.translate(
                  'xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.unfreeze.alternativeOption.title',
                  {
                    defaultMessage: 'Alternatively: Manually delete index',
                  }
                ),
                description: (
                  <EuiText size="m">
                    <FormattedMessage
                      id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.unfreeze.alternativeOption.description"
                      defaultMessage="If you no longer need it, you can also delete the index from {indexManagementLinkHtml}."
                      values={{
                        indexManagementLinkHtml: (
                          <EuiLink
                            href={`${http.basePath.prepend(
                              `/app/management/data/index_management/indices/index_details?indexName=${indexName}`
                            )}`}
                          >
                            <FormattedMessage
                              id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.indexMgmtLink"
                              defaultMessage="Index Management"
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
              {/* We cannot unfreeze backing indices (that would break the related data_stream) */}
              {!isInDataStream && !hasFetchFailed && !isCompleted && hasRequiredPrivileges && (
                <EuiFlexItem grow={false}>
                  <EuiButton
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
              {!hasFetchFailed && !isCompleted && hasRequiredPrivileges && (
                <EuiFlexItem grow={false}>
                  <EuiButton
                    fill
                    onClick={unfreeze}
                    disabled={loading}
                    data-test-subj="startIndexReadonlyButton"
                  >
                    <FormattedMessage
                      id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.unfreezeIndexButton"
                      defaultMessage="Unfreeze"
                      data-test-subj="startIndexReadonlyButton"
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
