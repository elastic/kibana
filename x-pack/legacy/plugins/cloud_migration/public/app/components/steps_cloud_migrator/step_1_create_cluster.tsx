/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiSpacer, EuiButton, EuiText, EuiCodeBlock } from '@elastic/eui';

import { LocalClusterState } from '../../../../common/types';
import { useCore } from '../../app_context';
import { StepsState } from '../cloud_migrator';

interface Props {
  onUpdate(updatedData: { isComplete: boolean; data: LocalClusterState }): void;
  stepsState: StepsState;
  isEnabled: boolean;
}

export const CreateCloudCluster = ({ onUpdate, isEnabled }: Props) => {
  const { api } = useCore();
  const [clusterState, setClusterState] = useState<LocalClusterState | undefined>(undefined);
  const [isLoadingClusterState, setIsLoadingClusterState] = useState<boolean>(false);

  const fetchClusterData = async () => {
    setIsLoadingClusterState(true);

    const { data, error } = await api.cluster.state.get();

    if (error) {
      // Do something about it!
    }

    setClusterState(data);
    setIsLoadingClusterState(false);
  };

  const createCloudCluster = () => {
    const clusterStateToBase64 = btoa(JSON.stringify(clusterState));

    // Navigate to cloud in a new Window tab
    const href = `https://www.elastic.co/cloud/elasticsearch-service/signup?c=${clusterStateToBase64}`;
    const linkTag = document.createElement('a');
    linkTag.href = href;
    linkTag.setAttribute('target', '_blank');
    linkTag.click();

    onUpdate({ isComplete: true, data: clusterState! });
  };

  const renderWelcomMessage = () => (
    <>
      <p>
        In order to create your cloud cluster we need to gather information from your current
        cluster.
      </p>
      <EuiSpacer size="xs" />
      <EuiText size="xs" color="subdued">
        You will be able to see the data collected before we send it to our cloud platform.
      </EuiText>
      <EuiSpacer />
      <EuiButton color="primary" isLoading={isLoadingClusterState} onClick={fetchClusterData}>
        I agree
      </EuiButton>
    </>
  );

  const renderClusterStatePreview = () => (
    <>
      <p>
        This is the information that we've collected. If you agree, we will send this information to
        our cloud platform to create your cluster.
      </p>
      <EuiSpacer size="m" />
      <EuiCodeBlock lang="json">{JSON.stringify(clusterState, null, 2)}</EuiCodeBlock>
      <EuiSpacer size="m" />
      <EuiButton color="primary" isLoading={isLoadingClusterState} onClick={createCloudCluster}>
        Create cloud cluster
      </EuiButton>
    </>
  );

  if (!isEnabled) {
    return null;
  }

  return clusterState ? renderClusterStatePreview() : renderWelcomMessage();
};
