/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSpacer, EuiText } from '@elastic/eui';

import type { Control, UseFormUnregister } from 'react-hook-form';
import type { DataSourceType } from '../../common/datasource_types';
import type { CreateDataSourceFlyoutFormValues } from './create_data_source_flyout_form_state';
import { CreateDataSourceFlyoutTypeSettingsAzure } from './create_data_source_flyout_type_settings_azure';
// import { CreateDataSourceFlyoutTypeSettingsFlight } from './create_data_source_flyout_type_settings_flight';
import { CreateDataSourceFlyoutTypeSettingsGcs } from './create_data_source_flyout_type_settings_gcs';
// import { CreateDataSourceFlyoutTypeSettingsIceberg } from './create_data_source_flyout_type_settings_iceberg';
// import { CreateDataSourceFlyoutTypeSettingsJdbc } from './create_data_source_flyout_type_settings_jdbc';
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

  /*
  if (dataSourceType === 'iceberg') {
    return <CreateDataSourceFlyoutTypeSettingsIceberg control={control} unregister={unregister} />;
  }

  if (dataSourceType === 'jdbc') {
    return <CreateDataSourceFlyoutTypeSettingsJdbc control={control} unregister={unregister} />;
  }

  if (dataSourceType === 'flight') {
    return <CreateDataSourceFlyoutTypeSettingsFlight control={control} unregister={unregister} />;
  }
*/
  return null;
}

/**
 * Spacer + heading for the type-specific block (keeps the main flyout lean).
 */
export function CreateDataSourceFlyoutTypeSettingsBlock(props: {
  dataSourceType: DataSourceType;
  control: Control<CreateDataSourceFlyoutFormValues, any>;
  unregister: UseFormUnregister<CreateDataSourceFlyoutFormValues>;
}) {
  return (
    <>
      <EuiSpacer size="m" />
      <EuiText size="s" color="subdued" data-test-subj="createDataSourceFlyoutTypeSettingsHelp">
        {i18n.translate('dataSets.createFlyout.typeSettingsHelp', {
          defaultMessage: 'Connection settings for the selected data source type.',
        })}
      </EuiText>
      <EuiSpacer size="s" />
      <CreateDataSourceFlyoutTypeSettings {...props} />
    </>
  );
}
