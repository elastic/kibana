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

import {
  EnrichedDeprecationInfo,
  ReindexAction,
  ReindexStatus,
} from '../../../../../../../../../common/types';
import { LoadingState } from '../../../../../../types';
import type { ReindexState } from '../../../use_reindex';
import { useAppContext } from '../../../../../../../app_context';
import { getReindexButtonLabel } from './messages';
import { FrozenCallOut } from '../frozen_callout';
import type { UpdateIndexState } from '../../../use_update_index';
import { FetchFailedCallOut } from '../fetch_failed_callout';
import { ReindexingFailedCallOut } from '../reindexing_failed_callout';
import { MlAnomalyGuidance } from './ml_anomaly_guidance';
import { ESTransformsTargetGuidance } from './es_transform_target_guidance';

const ML_ANOMALIES_PREFIX = '.ml-anomalies-';

/**
 * Displays a flyout that shows the details / corrective action for a "reindex" deprecation for a given index.
 */
export const ReindexDetailsFlyoutStep: React.FunctionComponent<{
  reindexState: ReindexState;
  updateIndexState: UpdateIndexState;
  deprecation: EnrichedDeprecationInfo;
  startReindex: () => void;
  startReadonly: () => void;
  closeFlyout: () => void;
}> = ({
  reindexState,
  updateIndexState,
  deprecation,
  startReindex,
  startReadonly,
  closeFlyout,
}) => {
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
  const correctiveAction = deprecation.correctiveAction as ReindexAction | undefined;
  const isESTransformTarget = !!correctiveAction?.transformIds?.length;
  const isMLAnomalyIndex = Boolean(indexName?.startsWith(ML_ANOMALIES_PREFIX));

  const { data: nodes } = api.useLoadNodeDiskSpace();

  let showEsTransformsGuidance = false;
  let showMlAnomalyReindexingGuidance = false;
  let showReadOnlyGuidance = false;
  let showDefaultGuidance = false;
  let showRollupGuidance = false;

  if (isESTransformTarget) {
    showEsTransformsGuidance = true;
  } else if (meta.isReadonly) {
    showReadOnlyGuidance = true;
  } else if (isMLAnomalyIndex) {
    showMlAnomalyReindexingGuidance = true;
  } else if (deprecation.isRollup) {
    showRollupGuidance = true;
  } else {
    showDefaultGuidance = true;
  }

  const defaultGuidanceIntro = (
    <p>
      <FormattedMessage
        id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.notCompatibleIndexText"
        defaultMessage="This index was created in ES 7.x and it is not compatible with the next major version. Choose one of the following options:"
      />
    </p>
  );

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
          {showEsTransformsGuidance && <ESTransformsTargetGuidance deprecation={deprecation} />}
          {showMlAnomalyReindexingGuidance && <MlAnomalyGuidance />}
          {showReadOnlyGuidance && (
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

          {showRollupGuidance && (
            <Fragment>
              {defaultGuidanceIntro}
              <p>
                Moving to a time series data stream and using downsampling is recommended. For your
                existing data you can -{' '}
              </p>
              <p>Disable the rollup job and mark the indexread only</p>
              <p>
                Reindex - need to try sending docs while reindexing. Stop job, reindex, create new
                job
              </p>
              <EuiDescriptionList
                rowGutterSize="m"
                listItems={[
                  {
                    title: i18n.translate(
                      'xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.reindexRollup.option1.title',
                      {
                        defaultMessage: 'Option 1: Manually mark read only',
                      }
                    ),
                    description: (
                      <Fragment>
                        <EuiText size="m">
                          <FormattedMessage
                            id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.reindexRollup.option1.description"
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
                        <br />
                        <EuiText size="m">
                          <FormattedMessage
                            id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.reindexRollup.option1.howTo"
                            defaultMessage="Use the Rollup Jobs management page to stop the job, then use Index Management mark the index as read-only."
                          />
                        </EuiText>
                      </Fragment>
                    ),
                  },
                  {
                    title: i18n.translate(
                      'xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.reindexRollup.option2.title',
                      {
                        defaultMessage: 'Option 2: Reindex data',
                      }
                    ),
                    description: (
                      <Fragment>
                        <EuiText size="m">
                          <FormattedMessage
                            id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.reindex.option2.descriptionRollup"
                            defaultMessage="The reindex operation allows transforming an index into a new, compatible one. It will copy all of the existing documents into a new index and remove the old one. Depending on size and resources, reindexing may take extended time and your data will be in a read-only state until the job has completed."
                          />
                        </EuiText>
                        <br />
                        <FormattedMessage
                          id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.reindex.option2.howTo"
                          defaultMessage="Stop "
                        />
                      </Fragment>
                    ),
                  },
                ]}
              />
            </Fragment>
          )}

          {showDefaultGuidance && (
            <Fragment>
              {defaultGuidanceIntro}
              <EuiDescriptionList
                rowGutterSize="m"
                listItems={[
                  {
                    title: i18n.translate(
                      'xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.reindex.option1.title',
                      {
                        defaultMessage: 'Option 1: Reindex data',
                      }
                    ),
                    description: (
                      <EuiText size="m">
                        <FormattedMessage
                          id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.reindex.option1.description"
                          defaultMessage="The reindex operation allows transforming an index into a new, compatible one. It will copy all of the existing documents into a new index and remove the old one. Depending on size and resources, reindexing may take extended time and your data will be in a read-only state until the job has completed."
                        />
                      </EuiText>
                    ),
                  },
                  {
                    title: i18n.translate(
                      'xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.reindex.option2.title',
                      {
                        defaultMessage: 'Option 2: Mark as read-only',
                      }
                    ),
                    description: (
                      <EuiText size="m">
                        <FormattedMessage
                          id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.reindex.option2.description"
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
                    title: i18n.translate(
                      'xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.reindex.option3.title',
                      {
                        defaultMessage: 'Option 3: Delete index',
                      }
                    ),
                    description: (
                      <EuiText size="m">
                        <FormattedMessage
                          id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.reindex.option3.description"
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
            </Fragment>
          )}
        </EuiText>
        <EuiSpacer />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="cross"
              onClick={closeFlyout}
              flush="left"
              data-test-subj="closeReindexButton"
            >
              <FormattedMessage
                id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.closeButtonLabel"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s">
              {!meta.isReadonly &&
                !hasFetchFailed &&
                !isCompleted &&
                hasRequiredPrivileges &&
                !isESTransformTarget &&
                !deprecation.isRollup && (
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
              {!hasFetchFailed &&
                !isCompleted &&
                hasRequiredPrivileges &&
                !deprecation.isRollup && (
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
