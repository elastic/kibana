/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty, EuiSpacer, useGeneratedHtmlId } from '@elastic/eui';

import type { Control, UseFormUnregister } from 'react-hook-form';
import type { DataSourceType } from '../../common/datasource_types';
import type { CreateDataSourceFlyoutFormValues } from './types';
import { DATA_SOURCES_DEFINITIONS } from './data_sources';

export function DataSourceAdvancedSettings({
  dataSourceType,
  control,
  unregister,
}: {
  dataSourceType: DataSourceType;
  control: Control<CreateDataSourceFlyoutFormValues, any>;
  unregister: UseFormUnregister<CreateDataSourceFlyoutFormValues>;
}) {
  const DataSourceAdvancedSettingsComponent =
    DATA_SOURCES_DEFINITIONS[dataSourceType].dataSourceAdvancedSettingsComponent;
  return <DataSourceAdvancedSettingsComponent control={control} unregister={unregister} />;
}

/**
 * Spacer + heading for the type-specific block (keeps the main flyout lean).
 */
export function CreateDataSourceFlyoutTypeSettingsBlock(props: {
  dataSourceType: DataSourceType;
  control: Control<CreateDataSourceFlyoutFormValues, any>;
  unregister: UseFormUnregister<CreateDataSourceFlyoutFormValues>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const contentId = useGeneratedHtmlId({ prefix: 'createDataSourceFlyoutConnectionSettings' });

  return (
    <>
      <EuiSpacer size="m" />
      <EuiButtonEmpty
        size="s"
        flush="left"
        iconType={isOpen ? 'chevronSingleDown' : 'chevronSingleRight'}
        aria-expanded={isOpen}
        aria-controls={contentId}
        onClick={() => setIsOpen((value) => !value)}
        data-test-subj="createDataSourceFlyoutConnectionSettingsToggle"
      >
        {isOpen
          ? i18n.translate('xpack.dataFederation.createFlyout.connectionSettings.hide', {
              defaultMessage: 'Hide connection settings',
            })
          : i18n.translate('xpack.dataFederation.createFlyout.connectionSettings.show', {
              defaultMessage: 'Show connection settings',
            })}
      </EuiButtonEmpty>
      <div id={contentId} hidden={!isOpen}>
        <EuiSpacer size="s" />
        <DataSourceAdvancedSettings {...props} />
      </div>
    </>
  );
}
