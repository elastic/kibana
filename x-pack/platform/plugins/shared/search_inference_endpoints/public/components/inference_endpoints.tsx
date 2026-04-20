/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';

import { EuiLoadingSpinner, EuiPageTemplate } from '@elastic/eui';
import { ServiceProviderKeys } from '@kbn/inference-endpoint-ui-common';

import { useQueryInferenceEndpoints } from '../hooks/use_inference_endpoints';
import { isEndpointPreconfigured } from '../utils/preconfigured_endpoint_helper';
import { TabularPage } from './all_inference_endpoints/tabular_page';
import { ExternalInferenceHeader } from './external_inference_header';
import { AddInferenceFlyoutWrapper } from './add_inference_endpoints/add_inference_flyout_wrapper';
import { ExternalInferenceEmptyPrompt } from './external_inference_empty_prompt';

export const InferenceEndpoints: React.FC = () => {
  const { data, isLoading, refetch } = useQueryInferenceEndpoints();
  const [isAddInferenceFlyoutOpen, setIsAddInferenceFlyoutOpen] = useState<boolean>(false);

  const onFlyoutOpen = useCallback(() => {
    setIsAddInferenceFlyoutOpen(true);
  }, []);

  const onFlyoutClose = useCallback(() => {
    setIsAddInferenceFlyoutOpen(false);
  }, []);

  const reload = useCallback(() => {
    refetch();
  }, [refetch]);

  const inferenceEndpoints = useMemo(() => {
    const endpoints = data || [];
    return endpoints.filter(
      (ep) =>
        ep.service !== ServiceProviderKeys.elastic &&
        ep.service !== ServiceProviderKeys.elasticsearch &&
        !isEndpointPreconfigured(ep.inference_id)
    );
  }, [data]);

  const showEmptyState = inferenceEndpoints.length === 0;

  if (isLoading) {
    return (
      <EuiPageTemplate.Section alignment="center" data-test-subj="inferenceEndpointsLoading">
        <EuiLoadingSpinner size="l" />
      </EuiPageTemplate.Section>
    );
  }

  if (showEmptyState) {
    return (
      <>
        <ExternalInferenceEmptyPrompt onFlyoutOpen={onFlyoutOpen} />
        {isAddInferenceFlyoutOpen && (
          <AddInferenceFlyoutWrapper onFlyoutClose={onFlyoutClose} reloadFn={reload} />
        )}
      </>
    );
  }

  return (
    <>
      <ExternalInferenceHeader onFlyoutOpen={onFlyoutOpen} />
      <EuiPageTemplate.Section className="eui-yScroll" data-test-subj="inferenceManagementPage">
        <TabularPage inferenceEndpoints={inferenceEndpoints} />
      </EuiPageTemplate.Section>
      {isAddInferenceFlyoutOpen && (
        <AddInferenceFlyoutWrapper onFlyoutClose={onFlyoutClose} reloadFn={reload} />
      )}
    </>
  );
};
