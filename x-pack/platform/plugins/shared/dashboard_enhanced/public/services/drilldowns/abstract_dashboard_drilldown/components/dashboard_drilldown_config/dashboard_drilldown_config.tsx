/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';
import {
  withSuspense,
  DashboardDrilldownOptionsComponent,
} from '@kbn/presentation-util-plugin/public';

import { txtChooseDestinationDashboard } from './i18n';
import { Config as DrilldownConfig } from '../../types';

const DashboardDrilldownOptions = withSuspense(DashboardDrilldownOptionsComponent, null);

export interface DashboardDrilldownConfigProps {
  dashboards: Array<EuiComboBoxOptionOption<string>>;
  onDashboardSelect: (dashboardId: string) => void;
  onSearchChange: (searchString: string) => void;
  isLoading: boolean;
  error?: string;
  config: DrilldownConfig;
  onConfigChange: (changes: Partial<DrilldownConfig>) => void;
}

export const DashboardDrilldownConfig: React.FC<DashboardDrilldownConfigProps> = ({
  dashboards,
  onDashboardSelect,
  onSearchChange,
  isLoading,
  error,
  config,
  onConfigChange,
}: DashboardDrilldownConfigProps) => {
  const selectedTitle = dashboards.find((item) => item.value === config.dashboardId)?.label || '';

  return (
    <>
      <EuiFormRow label={txtChooseDestinationDashboard} fullWidth isInvalid={!!error} error={error}>
        <EuiComboBox<string>
          async
          selectedOptions={
            config.dashboardId ? [{ label: selectedTitle, value: config.dashboardId }] : []
          }
          options={dashboards}
          onChange={([{ value = '' } = { value: '' }]) => onDashboardSelect(value)}
          onSearchChange={onSearchChange}
          isLoading={isLoading}
          singleSelection={{ asPlainText: true }}
          fullWidth
          data-test-subj={'dashboardDrilldownSelectDashboard'}
          isInvalid={!!error}
        />
      </EuiFormRow>
      <DashboardDrilldownOptions options={config} onOptionChange={onConfigChange} />
    </>
  );
};
