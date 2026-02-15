/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ScopedHistory } from '@kbn/core/public';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiLoadingLogo,
  EuiOverlayMask,
  EuiSpacer,
  EuiPageHeader,
  EuiPageSection,
  EuiPageBody,
  EuiPageTemplate,
  EuiTitle,
  EuiLink,
} from '@elastic/eui';

import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import { remoteClustersUrl } from '../../services/documentation';
import { extractQueryParams, SectionLoading } from '../../../shared_imports';
import { setBreadcrumbs } from '../../services/breadcrumb';
import type { RemoteCluster } from '../../store/types';

import { RemoteClusterTable } from './remote_cluster_table';

import { DetailPanel } from './detail_panel';

const REFRESH_RATE_MS = 30000;

export interface Props {
  loadClusters: () => void;
  refreshClusters: () => void;
  openDetailPanel: (clusterName: string) => void;
  closeDetailPanel: () => void;
  isDetailPanelOpen: boolean;
  clusters: RemoteCluster[];
  isLoading: boolean;
  isCopyingCluster: boolean;
  isRemovingCluster: boolean;
  clusterLoadError: unknown;
  history: ScopedHistory;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function getHttpErrorStatus(error: unknown): number | undefined {
  if (!isRecord(error)) return undefined;
  if (typeof error.status === 'number') return error.status;

  if (isRecord(error.body) && typeof error.body.statusCode === 'number') {
    return error.body.statusCode;
  }

  return undefined;
}

function getHttpErrorBody(error: unknown): { statusCode: number; error: string } | undefined {
  if (!isRecord(error) || !isRecord(error.body)) return undefined;

  const { statusCode, error: errorString } = error.body;
  if (typeof statusCode !== 'number' || typeof errorString !== 'string') return undefined;

  return { statusCode, error: errorString };
}

export class RemoteClusterList extends Component<Props> {
  static propTypes = {
    loadClusters: PropTypes.func.isRequired,
    refreshClusters: PropTypes.func.isRequired,
    openDetailPanel: PropTypes.func.isRequired,
    closeDetailPanel: PropTypes.func.isRequired,
    isDetailPanelOpen: PropTypes.bool,
    clusters: PropTypes.array,
    isLoading: PropTypes.bool,
    isCopyingCluster: PropTypes.bool,
    isRemovingCluster: PropTypes.bool,
  };

  interval?: ReturnType<typeof setInterval>;

  componentDidUpdate() {
    const {
      openDetailPanel,
      closeDetailPanel,
      isDetailPanelOpen,
      history: {
        location: { search },
      },
    } = this.props;

    const { cluster: clusterName } = extractQueryParams(search);

    // Show deeplinked remoteCluster whenever remoteClusters get loaded or the URL changes.
    if (typeof clusterName === 'string') {
      openDetailPanel(clusterName);
    } else if (Array.isArray(clusterName) && typeof clusterName[0] === 'string') {
      openDetailPanel(clusterName[0]);
    } else if (isDetailPanelOpen) {
      closeDetailPanel();
    }
  }

  componentDidMount() {
    this.props.loadClusters();
    this.interval = setInterval(this.props.refreshClusters, REFRESH_RATE_MS);
    setBreadcrumbs('home');
  }

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  renderBlockingAction() {
    const { isCopyingCluster, isRemovingCluster } = this.props;

    if (isCopyingCluster || isRemovingCluster) {
      return (
        <EuiOverlayMask>
          <EuiLoadingLogo logo="logoKibana" size="xl" />
        </EuiOverlayMask>
      );
    }

    return null;
  }

  renderNoPermission() {
    return (
      <EuiPageTemplate.EmptyPrompt
        iconType="warning"
        color="danger"
        title={
          <h2>
            <FormattedMessage
              id="xpack.remoteClusters.remoteClusterList.noPermissionTitle"
              defaultMessage="Permission error"
            />
          </h2>
        }
        body={
          <p>
            <FormattedMessage
              id="xpack.remoteClusters.remoteClusterList.noPermissionText"
              defaultMessage="You do not have permission to view or add remote clusters."
            />
          </p>
        }
      />
    );
  }

  renderError(error: unknown) {
    // We can safely depend upon the shape of this error coming from http service, because we
    // handle unexpected error shapes in the API action.
    const body = getHttpErrorBody(error);
    const statusCode = body?.statusCode;
    const errorString = body?.error;

    return (
      <EuiPageTemplate.EmptyPrompt
        iconType="warning"
        color="danger"
        title={
          <h2>
            <FormattedMessage
              id="xpack.remoteClusters.remoteClusterList.loadingErrorTitle"
              defaultMessage="Error loading remote clusters"
            />
          </h2>
        }
        body={
          <p>
            {statusCode} {errorString}
          </p>
        }
      />
    );
  }

  renderEmpty() {
    return (
      <EuiPageTemplate.EmptyPrompt
        data-test-subj="remoteClusterListEmptyPrompt"
        iconType="managementApp"
        title={
          <h2>
            <FormattedMessage
              id="xpack.remoteClusters.remoteClusterList.emptyPromptTitle"
              defaultMessage="Add your first remote cluster"
            />
          </h2>
        }
        body={
          <p>
            <FormattedMessage
              id="xpack.remoteClusters.remoteClusterList.emptyPromptDescription"
              defaultMessage="Remote clusters create a uni-directional connection from your
                local cluster to other clusters."
            />
          </p>
        }
        actions={
          <EuiButton
            {...reactRouterNavigate(this.props.history, '/add')}
            fill
            iconType="plusInCircle"
            data-test-subj="remoteClusterEmptyPromptCreateButton"
          >
            <FormattedMessage
              id="xpack.remoteClusters.remoteClusterList.emptyPrompt.connectButtonLabel"
              defaultMessage="Add a remote cluster"
            />
          </EuiButton>
        }
        footer={
          <>
            <EuiTitle size="xxs">
              <span>
                <FormattedMessage
                  id="xpack.remoteClusters.remoteClusters.emptyState.docsDescription"
                  defaultMessage="Want to learn more?"
                />
              </span>
            </EuiTitle>{' '}
            <EuiLink href={remoteClustersUrl} target="_blank">
              <FormattedMessage
                id="xpack.remoteClusters.remoteClusters.emptyState.docsLink"
                defaultMessage="Read documentation"
              />
            </EuiLink>
          </>
        }
      />
    );
  }

  renderLoading() {
    return (
      <SectionLoading data-test-subj="remoteClustersTableLoading">
        <FormattedMessage
          id="xpack.remoteClusters.remoteClusterList.loadingTitle"
          defaultMessage="Loading remote clusters…"
        />
      </SectionLoading>
    );
  }

  renderList() {
    const { clusters } = this.props;

    return (
      <EuiPageBody data-test-subj="remote-clusters-list">
        <EuiPageSection paddingSize="none">
          <EuiPageHeader
            bottomBorder
            pageTitle={
              <FormattedMessage
                id="xpack.remoteClusters.remoteClusterListTitle"
                defaultMessage="Remote Clusters"
              />
            }
            rightSideItems={[
              <EuiButtonEmpty
                href={remoteClustersUrl}
                target="_blank"
                iconType="question"
                data-test-subj="documentationLink"
              >
                <FormattedMessage
                  id="xpack.remoteClusters.remoteClustersDocsLinkText"
                  defaultMessage="Remote Clusters docs"
                />
              </EuiButtonEmpty>,
            ]}
          />

          <EuiSpacer size="l" />

          <RemoteClusterTable clusters={clusters} />
          <DetailPanel />
        </EuiPageSection>
      </EuiPageBody>
    );
  }

  render() {
    const { isLoading, clusters, clusterLoadError } = this.props;
    const isEmpty = !isLoading && !clusters.length;
    const status = getHttpErrorStatus(clusterLoadError);
    const isAuthorized = status !== 403;

    let content;

    if (clusterLoadError) {
      if (!isAuthorized) {
        content = this.renderNoPermission();
      } else {
        content = this.renderError(clusterLoadError);
      }
    } else if (isEmpty) {
      content = this.renderEmpty();
    } else if (isLoading) {
      content = this.renderLoading();
    } else {
      content = this.renderList();
    }
    return (
      <>
        {content}
        {this.renderBlockingAction()}
      </>
    );
  }
}
