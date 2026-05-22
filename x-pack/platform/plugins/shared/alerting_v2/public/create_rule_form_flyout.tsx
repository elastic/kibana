/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import useAsync from 'react-use/lib/useAsync';
import type { ESQLControlVariable } from '@kbn/esql-types';
import { untilPluginStartServicesReady } from './kibana_services';

export interface CreateRuleFormFlyoutProps {
  query: string;
  onClose?: () => void;
  push?: boolean;
  esqlVariables?: ESQLControlVariable[];
  validationErrors?: string[];
  /** Whether to include the Form/YAML edit mode toggle (default: true) */
  includeYaml?: boolean;
}

export const DynamicRuleFormFlyout = ({
  includeYaml = true,
  ...props
}: CreateRuleFormFlyoutProps) => {
  const { loading, value } = useAsync(() => {
    const servicesPromise = untilPluginStartServicesReady();
    const modulePromise = import('@kbn/alerting-v2-rule-form');
    return Promise.all([servicesPromise, modulePromise]);
  }, []);

  const services = value?.[0];
  const Flyout = value?.[1]?.DynamicRuleFormFlyout;

  if (loading || !services || !Flyout) return <EuiLoadingSpinner size="l" />;

  return <Flyout {...props} services={services} includeYaml={includeYaml} />;
};
