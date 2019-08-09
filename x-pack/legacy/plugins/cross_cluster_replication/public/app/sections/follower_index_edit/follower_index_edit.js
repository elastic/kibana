/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent, Fragment } from 'react';
import PropTypes from 'prop-types';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import chrome from 'ui/chrome';
import { MANAGEMENT_BREADCRUMB } from 'ui/management';

import {
  EuiButtonEmpty,
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiOverlayMask,
  EuiPageContent,
  EuiSpacer,
} from '@elastic/eui';

import { listBreadcrumb, editBreadcrumb } from '../../services/breadcrumbs';
import routing from '../../services/routing';
import {
  FollowerIndexForm,
  FollowerIndexPageTitle,
  SectionLoading,
  SectionError,
  RemoteClustersProvider,
} from '../../components';
import { API_STATUS } from '../../constants';

export class FollowerIndexEdit extends PureComponent {
  static propTypes = {
    getFollowerIndex: PropTypes.func.isRequired,
    selectFollowerIndex: PropTypes.func.isRequired,
    saveFollowerIndex: PropTypes.func.isRequired,
    clearApiError: PropTypes.func.isRequired,
    apiError: PropTypes.object.isRequired,
    apiStatus: PropTypes.object.isRequired,
    followerIndex: PropTypes.object,
    followerIndexId: PropTypes.string,
  }

  static getDerivedStateFromProps({ followerIndexId }, { lastFollowerIndexId }) {
    if (lastFollowerIndexId !== followerIndexId) {
      return { lastFollowerIndexId: followerIndexId };
    }
    return null;
  }

  state = {
    lastFollowerIndexId: undefined,
    showConfirmModal: false,
  }

  componentDidMount() {
    const { match: { params: { id } }, selectFollowerIndex } = this.props;
    let decodedId;
    try {
      // When we navigate through the router (history.push) we need to decode both the uri and the id
      decodedId = decodeURI(id);
      decodedId = decodeURIComponent(decodedId);
    } catch (e) {
      // This is a page load. I guess that AngularJS router does already a decodeURI so it is not
      // necessary in this case.
      decodedId = decodeURIComponent(id);
    }

    selectFollowerIndex(decodedId);

    chrome.breadcrumbs.set([ MANAGEMENT_BREADCRUMB, listBreadcrumb, editBreadcrumb ]);
  }

  componentDidUpdate(prevProps, prevState) {
    const { followerIndex, getFollowerIndex } = this.props;
    // Fetch the follower index on the server if we don't have it (i.e. page reload)
    if (!followerIndex && prevState.lastFollowerIndexId !== this.state.lastFollowerIndexId) {
      getFollowerIndex(this.state.lastFollowerIndexId);
    }
  }

  componentWillUnmount() {
    this.props.clearApiError();
  }

  saveFollowerIndex = (name, followerIndex) => {
    this.editedFollowerIndexPayload = { name, followerIndex };
    this.showConfirmModal();
  }

  confirmSaveFollowerIhdex = () => {
    const { name, followerIndex } = this.editedFollowerIndexPayload;
    this.props.saveFollowerIndex(name, followerIndex);
    this.closeConfirmModal();
  }

  showConfirmModal = () => this.setState({ showConfirmModal: true });

  closeConfirmModal = () => this.setState({ showConfirmModal: false });

  renderLoadingFollowerIndex() {
    return (
      <SectionLoading>
        <FormattedMessage
          id="xpack.crossClusterReplication.followerIndexEditForm.loadingFollowerIndexTitle"
          defaultMessage="Loading follower index…"
        />
      </SectionLoading>
    );
  }

  renderGetFollowerIndexError(error) {
    const { match: { params: { id: name } } } = this.props;
    const title = i18n.translate('xpack.crossClusterReplication.followerIndexEditForm.loadingErrorTitle', {
      defaultMessage: 'Error loading follower index'
    });
    const errorMessage = error.status === 404 ? {
      data: {
        error: i18n.translate(
          'xpack.crossClusterReplication.followerIndexEditForm.loadingErrorMessage',
          {
            defaultMessage: `The follower index '{name}' does not exist.`,
            values: { name }
          }
        )
      }
    } : error;

    return (
      <Fragment>
        <SectionError title={title} error={errorMessage} />

        <EuiSpacer size="m" />

        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              {...routing.getRouterLinkProps('/follower_indices')}
              iconType="arrowLeft"
              flush="left"
              data-test-subj="viewListFollowerIndexButton"
            >
              <FormattedMessage
                id="xpack.crossClusterReplication.followerIndexEditForm.viewFollowerIndicesButtonLabel"
                defaultMessage="View follower indices"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </Fragment>
    );
  }

  renderConfirmModal = () => {
    const { followerIndexId, followerIndex: { isPaused } } = this.props;
    const title = i18n.translate(
      'xpack.crossClusterReplication.followerIndexEditForm.confirmModal.title',
      {
        defaultMessage: `Update follower index '{id}'?`,
        values: { id: followerIndexId }
      }
    );

    return (
      <EuiOverlayMask>
        <EuiConfirmModal
          title={title}
          onCancel={this.closeConfirmModal}
          onConfirm={this.confirmSaveFollowerIhdex}
          cancelButtonText={
            i18n.translate(
              'xpack.crossClusterReplication.followerIndexEditForm.confirmModal.cancelButtonText',
              {
                defaultMessage: 'Cancel'
              }
            )
          }
          confirmButtonText={isPaused ? (
            <FormattedMessage
              id="xpack.crossClusterReplication.followerIndexEditForm.confirmModal.confirmAndResumeButtonText"
              defaultMessage="Update and resume"
            />
          ) : (
            <FormattedMessage
              id="xpack.crossClusterReplication.followerIndexEditForm.confirmModal.confirmButtonText"
              defaultMessage="Update"
            />
          )}
        >
          <p>
            {isPaused ? (
              <FormattedMessage
                id="xpack.crossClusterReplication.followerIndexEditForm.confirmModal.resumeDescription"
                defaultMessage="Updating a follower index resumes replication of its leader index."
              />
            ) : (
              <FormattedMessage
                id="xpack.crossClusterReplication.followerIndexEditForm.confirmModal.description"
                defaultMessage="The follower index is paused, then resumed. If the update fails,
                  try manually resuming replication."
              />
            )}
          </p>
        </EuiConfirmModal>
      </EuiOverlayMask>
    );
  }

  render() {
    const {
      clearApiError,
      apiStatus,
      apiError,
      followerIndex,
      match: { url: currentUrl }
    } = this.props;

    const { showConfirmModal } = this.state;

    /* remove non-editable properties */
    const { shards, ...rest } = followerIndex || {}; // eslint-disable-line no-unused-vars

    return (
      <EuiPageContent
        horizontalPosition="center"
        className="ccrPageContent"
      >
        <FollowerIndexPageTitle
          title={(
            <FormattedMessage
              id="xpack.crossClusterReplication.followerIndex.editTitle"
              defaultMessage="Edit follower index"
            />
          )}
        />

        {apiStatus.get === API_STATUS.LOADING && this.renderLoadingFollowerIndex()}

        {apiError.get && this.renderGetFollowerIndexError(apiError.get)}
        { followerIndex && (
          <RemoteClustersProvider>
            {({ isLoading, error, remoteClusters }) => {
              if (isLoading) {
                return (
                  <SectionLoading>
                    <FormattedMessage
                      id="xpack.crossClusterReplication.followerIndexEditForm.loadingRemoteClustersMessage"
                      defaultMessage="Loading remote clusters…"
                    />
                  </SectionLoading>
                );
              }

              return (
                <FollowerIndexForm
                  followerIndex={rest}
                  apiStatus={apiStatus.save}
                  apiError={apiError.save}
                  currentUrl={currentUrl}
                  remoteClusters={error ? [] : remoteClusters}
                  saveFollowerIndex={this.saveFollowerIndex}
                  clearApiError={clearApiError}
                  saveButtonLabel={(
                    <FormattedMessage
                      id="xpack.crossClusterReplication.followerIndexEditForm.saveButtonLabel"
                      defaultMessage="Update"
                    />
                  )}
                />
              );
            }}
          </RemoteClustersProvider>
        ) }

        { showConfirmModal && this.renderConfirmModal() }
      </EuiPageContent>
    );
  }
}
