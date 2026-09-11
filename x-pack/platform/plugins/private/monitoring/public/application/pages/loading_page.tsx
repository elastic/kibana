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
import { useClusterListingAvailability } from '../contexts/cluster_listing_availability_context';
import { useTitle } from '../hooks/use_title';

export const LoadingPage = ({ staticLoadingState }: { staticLoadingState?: boolean }) => {
  const { loaded, clusterCount } = useClusterListingAvailability();
  useTitle('', '');

  if (staticLoadingState || !loaded) {
    return <MonitoringAppLoading />;
  }

  if (clusterCount === 0) {
    return <Redirect to="/no-data" />;
  }
  if (clusterCount === 1) {
    // Bypass the cluster listing if there is just 1 cluster
    return <Redirect to="/overview" />;
  }

  return <Redirect to="/home" />;
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
