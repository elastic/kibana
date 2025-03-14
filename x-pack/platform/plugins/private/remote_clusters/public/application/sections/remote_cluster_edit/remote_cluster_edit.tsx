/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  EuiButton,
  EuiCallOut,
  EuiPageTemplate,
  EuiPageSection,
  EuiPageBody,
  EuiSpacer,
} from '@elastic/eui';

import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import { useRouteMatch } from 'react-router-dom';
import { RequestError } from '../../../types';
import { Cluster, ClusterPayload } from '../../../../common/lib';
import { extractQueryParams, SectionLoading } from '../../../shared_imports';
import { getRouter, redirect } from '../../services';
import { setBreadcrumbs } from '../../services/breadcrumb';
import { RemoteClusterPageTitle, RemoteClusterForm } from '../components';

const FORM_MAX_WIDTH = 850;

interface Props {
  isLoading: boolean;
  cluster: Cluster;
  startEditingCluster: (clusterName: string) => void;
  stopEditingCluster: () => void;
  editCluster: (cluster: ClusterPayload) => void;
  isEditingCluster: boolean;
  getEditClusterError?: RequestError;
  clearEditClusterErrors: () => void;
  openDetailPanel: (clusterName: string) => void;
}

export const RemoteClusterEdit: React.FC<Props> = ({
  isLoading,
  cluster,
  startEditingCluster,
  stopEditingCluster,
  editCluster,
  isEditingCluster,
  getEditClusterError,
  clearEditClusterErrors,
  openDetailPanel,
}) => {
  const match = useRouteMatch<{ name: string }>();
  const { name: clusterName } = match.params;
  const {
    history,
    route: {
      location: { search },
    },
  } = getRouter();

  useEffect(() => {
    setBreadcrumbs('edit', `?cluster=${clusterName}`);
    startEditingCluster(clusterName);

    return () => {
      clearEditClusterErrors();
      stopEditingCluster();
    };
  }, [clusterName, startEditingCluster, clearEditClusterErrors, stopEditingCluster]);

  const cancel = () => {
    const { redirect: redirectUrl } = extractQueryParams(search);

    if (redirectUrl && typeof redirectUrl === 'string') {
      const decodedRedirect = decodeURIComponent(redirectUrl);
      redirect(decodedRedirect);
    } else {
      history.push('/list');
      openDetailPanel(clusterName);
    }
  };

  if (isLoading) {
    return (
      <SectionLoading>
        <FormattedMessage
          id="xpack.remoteClusters.edit.loadingLabel"
          defaultMessage="Loading remote cluster…"
        />
      </SectionLoading>
    );
  }

  if (!cluster) {
    return (
      <EuiPageTemplate.EmptyPrompt
        iconType="warning"
        color="danger"
        title={
          <h2>
            <FormattedMessage
              id="xpack.remoteClusters.edit.loadingErrorTitle"
              defaultMessage="Error loading remote cluster"
            />
          </h2>
        }
        body={
          <p>
            <FormattedMessage
              id="xpack.remoteClusters.edit.loadingErrorMessage"
              defaultMessage="The remote cluster ''{name}'' does not exist."
              values={{ name: clusterName }}
            />
          </p>
        }
        actions={
          <EuiButton {...reactRouterNavigate(history, '/list')} color="danger" iconType="arrowLeft">
            <FormattedMessage
              id="xpack.remoteClusters.edit.viewRemoteClustersButtonLabel"
              defaultMessage="View remote clusters"
            />
          </EuiButton>
        }
      />
    );
  }

  const { hasDeprecatedProxySetting } = cluster;

  return (
    <EuiPageBody restrictWidth={true} data-test-subj="remote-clusters-edit">
      <EuiPageSection restrictWidth={FORM_MAX_WIDTH}>
        <RemoteClusterPageTitle
          title={
            <FormattedMessage
              id="xpack.remoteClusters.editTitle"
              defaultMessage="Edit remote cluster"
            />
          }
        />

        {hasDeprecatedProxySetting ? (
          <>
            <EuiCallOut
              title={
                <FormattedMessage
                  id="xpack.remoteClusters.edit.deprecatedSettingsTitle"
                  defaultMessage="Proceed with caution"
                />
              }
              color="warning"
              iconType="help"
            >
              <FormattedMessage
                id="xpack.remoteClusters.edit.deprecatedSettingsMessage"
                defaultMessage="This remote cluster has deprecated settings that we tried to resolve. Verify all changes before saving."
              />
            </EuiCallOut>
            <EuiSpacer />
          </>
        ) : null}

        <RemoteClusterForm
          cluster={cluster}
          isSaving={isEditingCluster}
          saveError={getEditClusterError}
          confirmFormAction={editCluster}
          onBack={cancel}
          confirmFormText={
            <FormattedMessage id="xpack.remoteClusters.edit.save" defaultMessage="Save" />
          }
          backFormText={
            <FormattedMessage
              id="xpack.remoteClusters.remoteClusterForm.cancelButtonLabel"
              defaultMessage="Cancel"
            />
          }
        />
      </EuiPageSection>
    </EuiPageBody>
  );
};
