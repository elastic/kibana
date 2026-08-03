/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { PureComponent } from 'react';
import type { ReactNode } from 'react';
import type { RouteComponentProps } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  EuiButton,
  EuiConfirmModal,
  EuiPageSection,
  EuiPageTemplate,
  htmlIdGenerator,
} from '@elastic/eui';

import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import type { ApiStatus, FollowerIndexWithPausedStatus } from '../../../../common/types';
import { setBreadcrumbs, listBreadcrumb, editBreadcrumb } from '../../services/breadcrumbs';
import type { CcrApiError } from '../../services/http_error';
import { getErrorBody, getErrorStatus } from '../../services/http_error';
import type { FollowerIndexSaveBody } from '../../services/api';
import {
  FollowerIndexForm,
  FollowerIndexPageTitle,
  RemoteClustersProvider,
} from '../../components';
import { API_STATUS } from '../../constants';
import { SectionLoading } from '../../../shared_imports';

export interface FollowerIndexEditProps extends RouteComponentProps<{ id: string }> {
  getFollowerIndex: (id: string) => void;
  selectFollowerIndex: (id: string | null) => void;
  saveFollowerIndex: (name: string, followerIndex: FollowerIndexSaveBody) => void;
  clearApiError: () => void;
  apiError: { get: CcrApiError | null; save: CcrApiError | null };
  apiStatus: { get: ApiStatus; save: ApiStatus };
  followerIndex: FollowerIndexWithPausedStatus | null;
  followerIndexId: string | null;
}

export interface FollowerIndexEditState {
  lastFollowerIndexId: string | undefined;
  showConfirmModal: boolean;
}

export class FollowerIndexEdit extends PureComponent<
  FollowerIndexEditProps,
  FollowerIndexEditState
> {
  private editedFollowerIndexPayload?: { name: string; followerIndex: FollowerIndexSaveBody };

  static getDerivedStateFromProps(
    { followerIndexId }: Pick<FollowerIndexEditProps, 'followerIndexId'>,
    { lastFollowerIndexId }: FollowerIndexEditState
  ): Partial<FollowerIndexEditState> | null {
    if (lastFollowerIndexId !== followerIndexId) {
      return { lastFollowerIndexId: followerIndexId ?? undefined };
    }
    return null;
  }

  state: FollowerIndexEditState = {
    lastFollowerIndexId: undefined,
    showConfirmModal: false,
  };

  componentDidMount() {
    const {
      match: {
        params: { id },
      },
      selectFollowerIndex,
    } = this.props;
    let decodedId: string;
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

    setBreadcrumbs([listBreadcrumb('/follower_indices'), editBreadcrumb]);
  }

  componentDidUpdate(prevProps: FollowerIndexEditProps, prevState: FollowerIndexEditState) {
    const { followerIndex, getFollowerIndex } = this.props;
    // Fetch the follower index on the server if we don't have it (i.e. page reload)
    if (!followerIndex && prevState.lastFollowerIndexId !== this.state.lastFollowerIndexId) {
      const id = this.state.lastFollowerIndexId;
      if (id !== undefined) {
        getFollowerIndex(id);
      }
    }
  }

  componentWillUnmount() {
    this.props.clearApiError();
  }

  saveFollowerIndex = (name: string, followerIndex: FollowerIndexSaveBody) => {
    this.editedFollowerIndexPayload = { name, followerIndex };
    this.showConfirmModal();
  };

  confirmSaveFollowerIhdex = () => {
    const payload = this.editedFollowerIndexPayload;
    if (!payload) {
      return;
    }
    const { name, followerIndex } = payload;
    this.props.saveFollowerIndex(name, followerIndex);
    this.closeConfirmModal();
  };

  showConfirmModal = () => this.setState({ showConfirmModal: true });

  closeConfirmModal = () => this.setState({ showConfirmModal: false });

  renderLoading(loadingTitle: ReactNode) {
    return <SectionLoading>{loadingTitle}</SectionLoading>;
  }

  renderGetFollowerIndexError(error: CcrApiError) {
    const {
      match: {
        params: { id: name },
      },
    } = this.props;

    const statusCode = getErrorStatus(error);
    const body = getErrorBody(error);
    const errorMessage: ReactNode =
      statusCode === 404
        ? i18n.translate(
            'xpack.crossClusterReplication.followerIndexEditForm.loadingErrorMessage',
            {
              defaultMessage: `The follower index ''{name}'' does not exist.`,
              values: { name },
            }
          )
        : body?.message ?? error.message;

    const listNav = reactRouterNavigate(this.props.history, `/follower_indices`);

    return (
      <EuiPageTemplate.EmptyPrompt
        color="danger"
        iconType="warning"
        title={
          <h2>
            <FormattedMessage
              id="xpack.crossClusterReplication.followerIndexEditForm.loadingErrorTitle"
              defaultMessage="Error loading follower index"
            />
          </h2>
        }
        body={<p>{errorMessage}</p>}
        actions={
          <EuiButton
            href={listNav.href}
            onClick={listNav.onClick}
            color="danger"
            iconType="chevronSingleLeft"
          >
            <FormattedMessage
              id="xpack.crossClusterReplication.followerIndexEditForm.viewFollowerIndicesButtonLabel"
              defaultMessage="View follower indices"
            />
          </EuiButton>
        }
      />
    );
  }

  renderConfirmModal = () => {
    const { followerIndexId, followerIndex } = this.props;

    if (!followerIndex) {
      return null;
    }

    const { isPaused } = followerIndex;
    const confirmModalTitleId = htmlIdGenerator()('confirmModalTitle');
    const title = i18n.translate(
      'xpack.crossClusterReplication.followerIndexEditForm.confirmModal.title',
      {
        defaultMessage: `Update follower index ''{id}''?`,
        values: { id: followerIndexId },
      }
    );

    return (
      <EuiConfirmModal
        aria-labelledby={confirmModalTitleId}
        title={title}
        titleProps={{ id: confirmModalTitleId }}
        onCancel={this.closeConfirmModal}
        onConfirm={this.confirmSaveFollowerIhdex}
        cancelButtonText={i18n.translate(
          'xpack.crossClusterReplication.followerIndexEditForm.confirmModal.cancelButtonText',
          {
            defaultMessage: 'Cancel',
          }
        )}
        confirmButtonText={
          isPaused ? (
            <FormattedMessage
              id="xpack.crossClusterReplication.followerIndexEditForm.confirmModal.confirmAndResumeButtonText"
              defaultMessage="Update and resume"
            />
          ) : (
            <FormattedMessage
              id="xpack.crossClusterReplication.followerIndexEditForm.confirmModal.confirmButtonText"
              defaultMessage="Update"
            />
          )
        }
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
    );
  };

  render() {
    const {
      clearApiError,
      apiStatus,
      apiError,
      followerIndex,
      match: { url: currentUrl },
    } = this.props;

    const { showConfirmModal } = this.state;

    if (apiStatus.get === API_STATUS.LOADING || !followerIndex) {
      return this.renderLoading(
        i18n.translate(
          'xpack.crossClusterReplication.followerIndexEditForm.loadingFollowerIndexTitle',
          { defaultMessage: 'Loading follower index…' }
        )
      );
    }

    if (apiError.get) {
      return this.renderGetFollowerIndexError(apiError.get);
    }

    const { shards: _shards, ...rest } = followerIndex;

    return (
      <RemoteClustersProvider>
        {({ isLoading, error, remoteClusters }) => {
          if (isLoading) {
            return this.renderLoading(
              i18n.translate(
                'xpack.crossClusterReplication.followerIndexEditForm.loadingRemoteClustersMessage',
                { defaultMessage: 'Loading remote clusters…' }
              )
            );
          }

          return (
            <EuiPageSection restrictWidth style={{ width: '100%' }}>
              <FollowerIndexPageTitle
                title={
                  <FormattedMessage
                    id="xpack.crossClusterReplication.followerIndex.editTitle"
                    defaultMessage="Edit follower index"
                  />
                }
              />

              <FollowerIndexForm
                followerIndex={rest}
                apiStatus={apiStatus.save}
                apiError={apiError.save}
                currentUrl={currentUrl}
                remoteClusters={error ? [] : remoteClusters}
                saveFollowerIndex={this.saveFollowerIndex}
                clearApiError={clearApiError}
                saveButtonLabel={
                  <FormattedMessage
                    id="xpack.crossClusterReplication.followerIndexEditForm.saveButtonLabel"
                    defaultMessage="Update"
                  />
                }
              />

              {showConfirmModal && this.renderConfirmModal()}
            </EuiPageSection>
          );
        }}
      </RemoteClustersProvider>
    );
  }
}
