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
import { CreateDataSourceFlyoutTypeSettingsS3 } from './create_data_source_flyout_type_settings_s3';

export function CreateDataSourceFlyoutTypeSettings({
  dataSourceType,
  control,
  unregister,
}: {
  dataSourceType: DataSourceType;
  control: Control<CreateDataSourceFlyoutFormValues, any>;
  unregister: UseFormUnregister<CreateDataSourceFlyoutFormValues>;
}) {
  if (dataSourceType === 's3') {
    return <CreateDataSourceFlyoutTypeSettingsS3 control={control} unregister={unregister} />;
  }

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
export function CreateDataSourceFlyoutTypeSettingsBlock(props: {
  dataSourceType: DataSourceType;
  control: Control<CreateDataSourceFlyoutFormValues, any>;
  unregister: UseFormUnregister<CreateDataSourceFlyoutFormValues>;
}) {
  return (
    <>
      <EuiSpacer size="m" />
      <CreateDataSourceFlyoutTypeSettings {...props} />
    </>
  );
}
