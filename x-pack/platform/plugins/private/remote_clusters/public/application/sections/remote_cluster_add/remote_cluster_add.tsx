/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiPageSection, EuiPageBody } from '@elastic/eui';

import { ClusterPayload } from '../../../../common/lib';
import { extractQueryParams } from '../../../shared_imports';
import { getRouter, redirect } from '../../services';
import { setBreadcrumbs } from '../../services/breadcrumb';
import { RemoteClusterPageTitle } from '../components';
import { RemoteClusterWizard } from './wizard_form';

interface Props {
  addCluster: (cluster: ClusterPayload) => void;
  isAddingCluster: boolean;
  addClusterError?: { message: string };
  clearAddClusterErrors: () => void;
}

export const RemoteClusterAdd: React.FC<Props> = ({
  addCluster,
  isAddingCluster,
  addClusterError,
  clearAddClusterErrors,
}) => {
  useEffect(() => {
    setBreadcrumbs('add');
    return () => {
      // Clean up after ourselves.
      clearAddClusterErrors();
    };
  }, [clearAddClusterErrors]);

  const redirectToList = () => {
    const {
      route: {
        location: { search },
      },
      history,
    } = getRouter();

    const { redirect: redirectUrl } = extractQueryParams(search);

    if (redirectUrl && typeof redirectUrl === 'string') {
      const decodedRedirect = decodeURIComponent(redirectUrl);
      redirect(decodedRedirect);
    } else {
      history.push('/list');
    }
  };

  return (
    <EuiPageBody data-test-subj="remote-clusters-add">
      <EuiPageSection paddingSize="none">
        <RemoteClusterPageTitle
          title={
            <FormattedMessage
              id="xpack.remoteClusters.addTitle"
              defaultMessage="Add remote cluster"
            />
          }
          description={
            <FormattedMessage
              id="xpack.remoteClusters.remoteClustersDescription"
              defaultMessage="Add a remote cluster that connects to seed nodes or to a single proxy address."
            />
          }
        />

        <RemoteClusterWizard
          saveRemoteClusterConfig={addCluster}
          onCancel={redirectToList}
          isSaving={isAddingCluster}
          addClusterError={addClusterError}
        />
      </EuiPageSection>
    </EuiPageBody>
  );
};
