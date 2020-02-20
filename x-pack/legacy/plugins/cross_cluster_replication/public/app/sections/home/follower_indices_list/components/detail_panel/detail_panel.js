/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from '@kbn/i18n/react';
import { getIndexListUri } from '../../../../../../../../index_management/public/application/services/navigation';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCodeEditor,
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiHealth,
  EuiIcon,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTextColor,
  EuiTitle,
} from '@elastic/eui';

import 'brace/theme/textmate';

import { ContextMenu } from '../context_menu';

import { API_STATUS } from '../../../../../constants';

export class DetailPanel extends Component {
  static propTypes = {
    apiStatus: PropTypes.string,
    followerIndexId: PropTypes.string,
    followerIndex: PropTypes.object,
    closeDetailPanel: PropTypes.func.isRequired,
  };

  renderFollowerIndex() {
    const {
      followerIndex: {
        remoteCluster,
        leaderIndex,
        isPaused,
        shards,
        maxReadRequestOperationCount,
        maxOutstandingReadRequests,
        maxReadRequestSize,
        maxWriteRequestOperationCount,
        maxWriteRequestSize,
        maxOutstandingWriteRequests,
        maxWriteBufferCount,
        maxWriteBufferSize,
        maxRetryDelay,
        readPollTimeout,
      },
    } = this.props;

    return (
      <Fragment>
        <EuiFlyoutBody>
          <section>
            <EuiDescriptionList>
              <EuiFlexGroup>
                <EuiFlexItem>
                  <EuiDescriptionListTitle>
                    <EuiTitle size="xs">
                      <FormattedMessage
                        id="xpack.crossClusterReplication.followerIndexDetailPanel.statusLabel"
                        defaultMessage="Status"
                      />
                    </EuiTitle>
                  </EuiDescriptionListTitle>

                  <EuiDescriptionListDescription data-test-subj="status">
                    {isPaused ? (
                      <EuiHealth color="subdued">
                        <FormattedMessage
                          id="xpack.crossClusterReplication.followerIndexDetailPanel.pausedStatus"
                          defaultMessage="Paused"
                        />
                      </EuiHealth>
                    ) : (
                      <EuiHealth color="success">
                        <FormattedMessage
                          id="xpack.crossClusterReplication.followerIndexDetailPanel.activeStatus"
                          defaultMessage="Active"
                        />
                      </EuiHealth>
                    )}
                  </EuiDescriptionListDescription>
                </EuiFlexItem>
              </EuiFlexGroup>

              <EuiSpacer size="s" />

              <EuiFlexGroup>
                <EuiFlexItem>
                  <EuiDescriptionListTitle>
                    <EuiTitle size="xs">
                      <FormattedMessage
                        id="xpack.crossClusterReplication.followerIndexDetailPanel.remoteClusterLabel"
                        defaultMessage="Remote cluster"
                      />
                    </EuiTitle>
                  </EuiDescriptionListTitle>

                  <EuiDescriptionListDescription data-test-subj="remoteCluster">
                    {remoteCluster}
                  </EuiDescriptionListDescription>
                </EuiFlexItem>

                <EuiFlexItem>
                  <EuiDescriptionListTitle>
                    <EuiTitle size="xs">
                      <FormattedMessage
                        id="xpack.crossClusterReplication.followerIndexDetailPanel.leaderIndexLabel"
                        defaultMessage="Leader index"
                      />
                    </EuiTitle>
                  </EuiDescriptionListTitle>

                  <EuiDescriptionListDescription data-test-subj="leaderIndex">
                    {leaderIndex}
                  </EuiDescriptionListDescription>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiDescriptionList>
          </section>

          <EuiSpacer size="l" />

          <section
            aria-labelledby="ccrFollowerIndexDetailSettingsTitle"
            data-test-subj="settingsSection"
          >
            <EuiTitle size="s">
              <h3 id="ccrFollowerIndexDetailSettingsTitle">
                <FormattedMessage
                  id="xpack.crossClusterReplication.followerIndexDetailPanel.settingsTitle"
                  defaultMessage="Settings"
                />
              </h3>
            </EuiTitle>

            <EuiSpacer size="s" />

            {isPaused ? (
              <EuiCallOut
                size="s"
                title={
                  <FormattedMessage
                    id="xpack.crossClusterReplication.followerIndexDetailPanel.pausedFollowerCalloutTitle"
                    defaultMessage="A paused follower index does not have settings or shard statistics."
                  />
                }
              />
            ) : (
              <EuiDescriptionList data-test-subj="settingsValues">
                <EuiFlexGroup>
                  <EuiFlexItem>
                    <EuiDescriptionListTitle>
                      <EuiTitle size="xs">
                        <FormattedMessage
                          id="xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxReadRequestOperationCountTitle"
                          defaultMessage="Max read request operation count"
                        />
                      </EuiTitle>
                    </EuiDescriptionListTitle>

                    <EuiDescriptionListDescription data-test-subj="maxReadReqOpCount">
                      {maxReadRequestOperationCount}
                    </EuiDescriptionListDescription>
                  </EuiFlexItem>

                  <EuiFlexItem>
                    <EuiDescriptionListTitle>
                      <EuiTitle size="xs">
                        <FormattedMessage
                          id="xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxOutstandingReadRequestsTitle"
                          defaultMessage="Max outstanding read requests"
                        />
                      </EuiTitle>
                    </EuiDescriptionListTitle>

                    <EuiDescriptionListDescription data-test-subj="maxOutstandingReadReq">
                      {maxOutstandingReadRequests}
                    </EuiDescriptionListDescription>
                  </EuiFlexItem>
                </EuiFlexGroup>

                <EuiSpacer size="s" />

                <EuiFlexGroup>
                  <EuiFlexItem>
                    <EuiDescriptionListTitle>
                      <EuiTitle size="xs">
                        <FormattedMessage
                          id="xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxReadRequestSizeTitle"
                          defaultMessage="Max read request size"
                        />
                      </EuiTitle>
                    </EuiDescriptionListTitle>

                    <EuiDescriptionListDescription data-test-subj="maxReadReqSize">
                      {maxReadRequestSize}
                    </EuiDescriptionListDescription>
                  </EuiFlexItem>

                  <EuiFlexItem>
                    <EuiDescriptionListTitle>
                      <EuiTitle size="xs">
                        <FormattedMessage
                          id="xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxWriteRequestOperationCountTitle"
                          defaultMessage="Max write request operation count"
                        />
                      </EuiTitle>
                    </EuiDescriptionListTitle>

                    <EuiDescriptionListDescription data-test-subj="maxWriteReqOpCount">
                      {maxWriteRequestOperationCount}
                    </EuiDescriptionListDescription>
                  </EuiFlexItem>
                </EuiFlexGroup>

                <EuiSpacer size="s" />

                <EuiFlexGroup>
                  <EuiFlexItem>
                    <EuiDescriptionListTitle>
                      <EuiTitle size="xs">
                        <FormattedMessage
                          id="xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxWriteRequestSizeTitle"
                          defaultMessage="Max write request size"
                        />
                      </EuiTitle>
                    </EuiDescriptionListTitle>

                    <EuiDescriptionListDescription data-test-subj="maxWriteReqSize">
                      {maxWriteRequestSize}
                    </EuiDescriptionListDescription>
                  </EuiFlexItem>

                  <EuiFlexItem>
                    <EuiDescriptionListTitle>
                      <EuiTitle size="xs">
                        <FormattedMessage
                          id="xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxOutstandingWriteRequestsTitle"
                          defaultMessage="Max outstanding write requests"
                        />
                      </EuiTitle>
                    </EuiDescriptionListTitle>

                    <EuiDescriptionListDescription data-test-subj="maxOutstandingWriteReq">
                      {maxOutstandingWriteRequests}
                    </EuiDescriptionListDescription>
                  </EuiFlexItem>
                </EuiFlexGroup>

                <EuiSpacer size="s" />

                <EuiFlexGroup>
                  <EuiFlexItem>
                    <EuiDescriptionListTitle>
                      <EuiTitle size="xs">
                        <FormattedMessage
                          id="xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxWriteBufferCountTitle"
                          defaultMessage="Max write buffer count"
                        />
                      </EuiTitle>
                    </EuiDescriptionListTitle>

                    <EuiDescriptionListDescription data-test-subj="maxWriteBufferCount">
                      {maxWriteBufferCount}
                    </EuiDescriptionListDescription>
                  </EuiFlexItem>

                  <EuiFlexItem>
                    <EuiDescriptionListTitle>
                      <EuiTitle size="xs">
                        <FormattedMessage
                          id="xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxWriteBufferSizeTitle"
                          defaultMessage="Max write buffer size"
                        />
                      </EuiTitle>
                    </EuiDescriptionListTitle>

                    <EuiDescriptionListDescription data-test-subj="maxWriteBufferSize">
                      {maxWriteBufferSize}
                    </EuiDescriptionListDescription>
                  </EuiFlexItem>
                </EuiFlexGroup>

                <EuiSpacer size="s" />

                <EuiFlexGroup>
                  <EuiFlexItem>
                    <EuiDescriptionListTitle>
                      <EuiTitle size="xs">
                        <FormattedMessage
                          id="xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxRetryDelayTitle"
                          defaultMessage="Max retry delay"
                        />
                      </EuiTitle>
                    </EuiDescriptionListTitle>

                    <EuiDescriptionListDescription data-test-subj="maxRetryDelay">
                      {maxRetryDelay}
                    </EuiDescriptionListDescription>
                  </EuiFlexItem>

                  <EuiFlexItem>
                    <EuiDescriptionListTitle>
                      <EuiTitle size="xs">
                        <FormattedMessage
                          id="xpack.crossClusterReplication.followerIndexForm.advancedSettings.readPollTimeoutTitle"
                          defaultMessage="Read poll timeout"
                        />
                      </EuiTitle>
                    </EuiDescriptionListTitle>

                    <EuiDescriptionListDescription data-test-subj="readPollTimeout">
                      {readPollTimeout}
                    </EuiDescriptionListDescription>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiDescriptionList>
            )}
          </section>

          <EuiSpacer size="l" />

          <section data-test-subj="shardsStatsSection">
            {shards &&
              shards.map((shard, i) => (
                <Fragment key={i}>
                  <EuiSpacer size="m" />
                  <EuiTitle size="xs">
                    <h3>
                      <FormattedMessage
                        id="xpack.crossClusterReplication.followerIndexDetailPanel.shardStatsTitle"
                        defaultMessage="Shard {id} stats"
                        values={{
                          id: shard.id,
                        }}
                      />
                    </h3>
                  </EuiTitle>
                  <EuiSpacer size="s" />
                  <EuiCodeEditor
                    mode="json"
                    theme="textmate"
                    width="100%"
                    isReadOnly
                    setOptions={{ maxLines: Infinity }}
                    value={JSON.stringify(shard, null, 2)}
                    editorProps={{
                      $blockScrolling: Infinity,
                    }}
                    data-test-subj={`shardsStats${i}`}
                  />
                </Fragment>
              ))}
          </section>
        </EuiFlyoutBody>
      </Fragment>
    );
  }

  renderContent() {
    const { apiStatus, followerIndex } = this.props;

    if (apiStatus === API_STATUS.LOADING) {
      return (
        <EuiFlyoutBody>
          <EuiFlexGroup justifyContent="flexStart" alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="m" />
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiText>
                <EuiTextColor color="subdued">
                  <FormattedMessage
                    id="xpack.crossClusterReplication.followerIndexDetailPanel.loadingLabel"
                    defaultMessage="Loading follower index…"
                  />
                </EuiTextColor>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutBody>
      );
    }

    if (!followerIndex) {
      return (
        <EuiFlyoutBody>
          <EuiFlexGroup justifyContent="flexStart" alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiIcon size="m" type="alert" color="danger" />
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiText>
                <EuiTextColor color="subdued">
                  <FormattedMessage
                    id="xpack.crossClusterReplication.followerIndexDetailPanel.notFoundLabel"
                    defaultMessage="Follower index not found"
                  />
                </EuiTextColor>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutBody>
      );
    }

    return this.renderFollowerIndex();
  }

  renderFooter() {
    const { followerIndexId, followerIndex, closeDetailPanel } = this.props;

    // Use ID instead of followerIndex, because followerIndex may not be loaded yet.
    const indexManagementUri = getIndexListUri(`name:${followerIndexId}`);

    return (
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="cross"
              flush="left"
              onClick={closeDetailPanel}
              data-test-subj="closeFlyoutButton"
            >
              <FormattedMessage
                id="xpack.crossClusterReplication.followerIndexDetailPanel.closeButtonLabel"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiFlexGroup>
              <EuiFlexItem grow={false}>
                <EuiButton href={indexManagementUri} data-test-subj="viewIndexManagementButton">
                  <FormattedMessage
                    id="xpack.crossClusterReplication.followerIndexDetailPanel.viewIndexLink"
                    defaultMessage="View in Index Management"
                  />
                </EuiButton>
              </EuiFlexItem>

              {followerIndex && (
                <EuiFlexItem grow={false}>
                  <ContextMenu
                    iconSide="left"
                    iconType="arrowUp"
                    anchorPosition="upRight"
                    label={
                      <FormattedMessage
                        id="xpack.crossClusterReplication.followerIndexDetailPanel.manageButtonLabel"
                        defaultMessage="Manage"
                      />
                    }
                    followerIndices={[followerIndex]}
                    testSubj="manageButton"
                  />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    );
  }

  render() {
    const { followerIndexId, closeDetailPanel } = this.props;

    return (
      <EuiFlyout
        className="ccrFollowerIndicesDetailPanel"
        data-test-subj="followerIndexDetail"
        onClose={closeDetailPanel}
        aria-labelledby="followerIndexDetailsFlyoutTitle"
        size="m"
        maxWidth={600}
      >
        <EuiFlyoutHeader>
          <EuiTitle size="m" id="followerIndexDetailsFlyoutTitle" data-test-subj="title">
            <h2>{followerIndexId}</h2>
          </EuiTitle>
        </EuiFlyoutHeader>

        {this.renderContent()}
        {this.renderFooter()}
      </EuiFlyout>
    );
  }
}
