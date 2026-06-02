/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';

import InferenceFlyoutWrapper from '@kbn/inference-endpoint-ui-common';
import { ServiceProviderKeys } from '@kbn/inference-endpoint-ui-common';
import { useKibana } from '../../hooks/use_kibana';
import { useUsageTracker } from '../../contexts/usage_tracker_context';
import { EventType } from '../../analytics/constants';

const EXCLUDED_PROVIDERS = [ServiceProviderKeys.elasticsearch, ServiceProviderKeys.elastic];

interface AddInferenceFlyoutWrapperProps {
  onFlyoutClose: () => void;
  reloadFn: () => void;
}

export const AddInferenceFlyoutWrapper: React.FC<AddInferenceFlyoutWrapperProps> = ({
  onFlyoutClose,
  reloadFn,
}) => {
  const {
    services: {
      http,
      notifications: { toasts },
      serverless,
    },
  } = useKibana();
  const usageTracker = useUsageTracker();

  const onSubmitSuccess = useCallback(() => {
    usageTracker.count(EventType.ENDPOINT_CREATED);
    reloadFn();
  }, [reloadFn, usageTracker]);

  return (
    <InferenceFlyoutWrapper
      onFlyoutClose={onFlyoutClose}
      http={http}
      enforceAdaptiveAllocations={!!serverless}
      toasts={toasts}
      onSubmitSuccess={onSubmitSuccess}
      excludeProviders={EXCLUDED_PROVIDERS}
    />
  );
};
