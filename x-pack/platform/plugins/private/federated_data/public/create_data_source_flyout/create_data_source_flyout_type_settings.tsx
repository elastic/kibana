/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty, EuiSpacer, useEuiTheme, useGeneratedHtmlId } from '@elastic/eui';

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
  const { euiTheme } = useEuiTheme();
  const [isOpen, setIsOpen] = useState(false);
  const contentId = useGeneratedHtmlId({ prefix: 'createDataSourceFlyoutConnectionSettings' });

  return (
    <>
      <EuiSpacer size="m" />
      <EuiButtonEmpty
        size="s"
        flush="left"
        iconType={isOpen ? 'arrowDown' : 'arrowRight'}
        aria-expanded={isOpen}
        aria-controls={contentId}
        onClick={() => setIsOpen((value) => !value)}
        data-test-subj="createDataSourceFlyoutConnectionSettingsToggle"
      >
        {isOpen
          ? i18n.translate('dataSets.createFlyout.connectionSettings.hide', {
              defaultMessage: 'Hide connection settings',
            })
          : i18n.translate('dataSets.createFlyout.connectionSettings.show', {
              defaultMessage: 'Show connection settings',
            })}
      </EuiButtonEmpty>
      <div
        id={contentId}
        hidden={!isOpen}
        css={css`
          padding-left: ${euiTheme.size.l};
        `}
      >
        <EuiSpacer size="s" />
        <CreateDataSourceFlyoutTypeSettings {...props} />
      </div>
    </>
  );
}
