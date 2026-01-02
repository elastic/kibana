/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiFormRow, EuiComboBox } from '@elastic/eui';
import {
  withSuspense,
  DashboardDrilldownOptionsComponent,
} from '@kbn/presentation-util-plugin/public';

import { i18n } from '@kbn/i18n';
import type { DashboardDrilldownConfig } from '../types';

const DashboardDrilldownOptions = withSuspense(DashboardDrilldownOptionsComponent, null);

export interface DashboardDrilldownEditorProps {
  dashboards: Array<EuiComboBoxOptionOption<string>>;
  onDashboardSelect: (dashboardId: string) => void;
  onSearchChange: (searchString: string) => void;
  isLoading: boolean;
  error?: string;
  config: DashboardDrilldownConfig;
  onConfigChange: (changes: Partial<DashboardDrilldownConfig>) => void;
}

export const DashboardDrilldownEditor: React.FC<DashboardDrilldownEditorProps> = ({
  dashboards,
  onDashboardSelect,
  onSearchChange,
  isLoading,
  error,
  config,
  onConfigChange,
}: DashboardDrilldownEditorProps) => {
  const selectedTitle = dashboards.find((item) => item.value === config.dashboardId)?.label || '';

  return (
    <>
      <EuiFormRow
        label={i18n.translate(
          'xpack.dashboard.components.DashboardDrilldownConfig.chooseDestinationDashboard',
          {
            defaultMessage: 'Choose destination dashboard',
          }
        )}
        fullWidth
        isInvalid={!!error}
        error={error}
      >
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
