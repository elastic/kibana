/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSuperDatePicker } from '@elastic/eui';
import type { CatalogComponent, ComponentRenderProps } from '@kbn/a2ui-renderer';
import { useCustomAppServices } from './services_context';

/**
 * The page time range, as a panel the author can place and style like anything
 * else. It reads and writes shared app state rather than a surface data model,
 * which is why it needs the services context: every ES|QL query in the app is
 * filtered by whatever this sets.
 */
function TimeFilterRenderer({ props, accessibility }: ComponentRenderProps) {
  const services = useCustomAppServices();

  if (!services) return null;

  return (
    <EuiSuperDatePicker
      start={services.timeRange.from}
      end={services.timeRange.to}
      onTimeChange={({ start, end }) => services.setTimeRange({ from: start, to: end })}
      showUpdateButton={props.showUpdateButton !== false}
      compressed={props.compressed === true}
      width={props.fullWidth === true ? 'full' : 'auto'}
      aria-label={accessibility?.label ?? 'Time range'}
    />
  );
}

export const KbnTimeFilter: CatalogComponent = {
  name: 'KbnTimeFilter',
  render: TimeFilterRenderer,
};
