/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPageTemplate } from '@elastic/eui';
import { AppHeaderLoading } from '@kbn/app-header';
import React from 'react';
import { Redirect } from 'react-router-dom';
import { PageLoading } from '../../components';
import { useClusters } from '../hooks/use_clusters';
import { useTitle } from '../hooks/use_title';
import { CODE_PATH_ELASTICSEARCH } from '../../../common/constants';
import { setHasClusterListing } from './get_monitoring_back';

const CODE_PATHS = [CODE_PATH_ELASTICSEARCH];

export const LoadingPage = ({ staticLoadingState }: { staticLoadingState?: boolean }) => {
  const { clusters, loaded } = useClusters(null, undefined, CODE_PATHS);
  useTitle('', '');

  if (staticLoadingState || loaded === false) {
    return <MonitoringAppLoading />;
  }

  setHasClusterListing(clusters.length > 1);
  return renderRedirections(clusters);
};

const MonitoringAppLoading = () => (
  <EuiPageTemplate
    offset={0}
    restrictWidth={false}
    grow={false}
    data-test-subj="monitoringAppContainer"
  >
    <EuiPageTemplate.Section>
      <AppHeaderLoading spacing="bleed" menu={{ buttonCount: 1, hasPrimary: true }} />
      <PageLoading />
    </EuiPageTemplate.Section>
  </EuiPageTemplate>
);

const renderRedirections = (clusters: any) => {
  if (!clusters || !clusters.length) {
    return <Redirect to="/no-data" />;
  }
  if (clusters.length === 1) {
    // Bypass the cluster listing if there is just 1 cluster
    return <Redirect to="/overview" />;
  }

  return <Redirect to="/home" />;
};
