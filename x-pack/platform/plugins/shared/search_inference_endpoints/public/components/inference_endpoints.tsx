/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';

import { EuiPageTemplate } from '@elastic/eui';
import { ServiceProviderKeys } from '@kbn/inference-endpoint-ui-common';

import { useQueryInferenceEndpoints } from '../hooks/use_inference_endpoints';
import { useKibana } from '../hooks/use_kibana';
import { isElasticInferenceServiceEnabled } from '../feature_flag';
import { TabularPage } from './all_inference_endpoints/tabular_page';
import { InferenceEndpointsHeader } from './inference_endpoints_header';
import { AddInferenceFlyoutWrapper } from './add_inference_endpoints/add_inference_flyout_wrapper';
import { ProviderInferenceEmptyPrompt } from './provider_inference_empty_prompt';

export const InferenceEndpoints: React.FC = () => {
  const { services } = useKibana();
  const { data, refetch } = useQueryInferenceEndpoints();
  const [isAddInferenceFlyoutOpen, setIsAddInferenceFlyoutOpen] = useState<boolean>(false);

  const isEisEnabled = isElasticInferenceServiceEnabled(services.uiSettings);

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
    if (isEisEnabled) {
      return endpoints.filter((ep) => ep.service !== ServiceProviderKeys.elastic);
    }
    return endpoints;
  }, [data, isEisEnabled]);

  const showEmptyState = isEisEnabled && inferenceEndpoints.length === 0;

  return (
    <>
      {showEmptyState ? (
        <ProviderInferenceEmptyPrompt onFlyoutOpen={onFlyoutOpen} />
      ) : (
        <>
          <InferenceEndpointsHeader onFlyoutOpen={onFlyoutOpen} />
          <EuiPageTemplate.Section className="eui-yScroll" data-test-subj="inferenceManagementPage">
            <TabularPage inferenceEndpoints={inferenceEndpoints} />
          </EuiPageTemplate.Section>
        </>
      )}
      {isAddInferenceFlyoutOpen && (
        <AddInferenceFlyoutWrapper onFlyoutClose={onFlyoutClose} reloadFn={reload} />
      )}
    </>
  );
};
