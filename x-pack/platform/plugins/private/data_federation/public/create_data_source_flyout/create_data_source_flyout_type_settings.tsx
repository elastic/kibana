/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';

import type { Control, UseFormUnregister } from 'react-hook-form';
import type { DataSourceType } from '../../common/datasource_types';
import type { CreateDataSourceFlyoutFormValues } from './types';
import { CreateDataSourceFlyoutTypeSettingsAzure } from './create_data_source_flyout_type_settings_azure';
import { CreateDataSourceFlyoutTypeSettingsGcs } from './create_data_source_flyout_type_settings_gcs';

export function CreateDataSourceFlyoutTypeSettings({
  dataSourceType,
  control,
  unregister,
}: {
  dataSourceType: DataSourceType;
  control: Control<CreateDataSourceFlyoutFormValues, any>;
  unregister: UseFormUnregister<CreateDataSourceFlyoutFormValues>;
}) {
  if (dataSourceType === 'gcs') {
    return <CreateDataSourceFlyoutTypeSettingsGcs control={control} unregister={unregister} />;
  }

  if (dataSourceType === 'azure') {
    return <CreateDataSourceFlyoutTypeSettingsAzure control={control} unregister={unregister} />;
  }
  return null;
}

/**
 * Type-specific connection fields shown directly on the flyout form.
 */
const DATA_SOURCE_TYPES_WITH_TYPE_SETTINGS: ReadonlySet<DataSourceType> = new Set([
  'gcs',
  'azure',
]);

export function CreateDataSourceFlyoutTypeSettingsBlock(props: {
  dataSourceType: DataSourceType;
  control: Control<CreateDataSourceFlyoutFormValues, any>;
  unregister: UseFormUnregister<CreateDataSourceFlyoutFormValues>;
}) {
  if (!DATA_SOURCE_TYPES_WITH_TYPE_SETTINGS.has(props.dataSourceType)) {
    return null;
  }

  return (
    <>
      <EuiSpacer size="m" />
      <CreateDataSourceFlyoutTypeSettings {...props} />
    </>
  );
}
