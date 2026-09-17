/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiSuperSelect,
  EuiTextArea,
  useEuiTheme,
  type EuiSuperSelectOption,
} from '@elastic/eui';
import type { Control } from 'react-hook-form';
import { useController } from 'react-hook-form';
import { useKibana } from '@kbn/kibana-react-plugin/public';

import type { DataSource, DataSourceWithSecrets } from '../../common';
import { DATA_SOURCE_TYPES_TO_ICONS, validateIndexNameRules } from '../../common';
import { CreateDataSourceFlyout } from '../create_data_source_flyout';
import { getFlyoutSaveErrorMessage } from '../get_flyout_save_error_message';
import type { DataFederationKibanaServices } from '../types';
import type { CreateDatasetFormValues } from './create_dataset_form_state';
import { createDatasetFormStrings } from './create_dataset_form_i18n';

const trimRequired =
  (message: string) =>
  (value: string): true | string =>
    value?.trim() ? true : message;

const CONNECT_NEW_DATA_SOURCE = '__connect_new_data_source__';

const dataSourceOptionDisplay = (dataSource: DataSource) => {
  const iconType = DATA_SOURCE_TYPES_TO_ICONS[dataSource.type];
  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      {iconType ? (
        <EuiFlexItem grow={false}>
          <EuiIcon type={iconType} size="m" aria-hidden={true} />
        </EuiFlexItem>
      ) : null}
      <EuiFlexItem grow={false}>{dataSource.name}</EuiFlexItem>
    </EuiFlexGroup>
  );
};

export interface CreateDatasetDetailsFieldsProps {
  control: Control<CreateDatasetFormValues>;
  dataSources: DataSource[];
  existingDataSetNames?: readonly string[];
  isEditMode?: boolean;
  initialIdNormalized?: string;
  loadDataSources: () => Promise<void>;
}

export function CreateDatasetDetailsFields({
  control,
  dataSources,
  existingDataSetNames = [],
  isEditMode = false,
  initialIdNormalized = '',
  loadDataSources,
}: CreateDatasetDetailsFieldsProps) {
  const { euiTheme } = useEuiTheme();
  const {
    services: { dataSourcesClient },
  } = useKibana<DataFederationKibanaServices>();
  const [isCreateDataSourceOpen, setIsCreateDataSourceOpen] = useState(false);
  const { field: nameField, fieldState: nameFieldState } = useController({
    name: 'name',
    control,
    rules: {
      validate: (value: string) => {
        const trimmed = value.trim();
        if (!trimmed) {
          return createDatasetFormStrings.nameRequired();
        }

        const nameValidation = validateIndexNameRules(trimmed);
        if (nameValidation) {
          return nameValidation.message;
        }

        const normalized = trimmed.toLowerCase();
        const isDuplicate = existingDataSetNames.some((n) => {
          const nNormalized = n.trim().toLowerCase();
          if (isEditMode && nNormalized === initialIdNormalized) {
            return false;
          }
          return nNormalized === normalized;
        });
        return isDuplicate ? createDatasetFormStrings.nameAlreadyExists() : true;
      },
    },
  });

  const { field: descriptionField } = useController({
    name: 'description',
    control,
  });

  const { field: dataSourceIdField, fieldState: dataSourceFieldState } = useController({
    name: 'data_source',
    control,
    rules: {
      validate: trimRequired(createDatasetFormStrings.dataSourceRequired()),
    },
  });

  const { field: resourceField, fieldState: resourceFieldState } = useController({
    name: 'resource',
    control,
    rules: {
      validate: trimRequired(createDatasetFormStrings.resourceRequired()),
    },
  });

  const isDataSourceEmpty = !dataSourceIdField.value;
  const existingDataSourceNames = useMemo(
    () => dataSources.map((dataSource) => dataSource.name),
    [dataSources]
  );

  const dataSourceOptions = useMemo((): Array<EuiSuperSelectOption<string>> => {
    const fromSources = dataSources.map((dataSource) => {
      const display = dataSourceOptionDisplay(dataSource);
      return {
        value: dataSource.name,
        inputDisplay: display,
        dropdownDisplay: display,
        'data-test-subj': `createDatasetDataSource-${dataSource.name}`,
      };
    });
    const connectLabel = createDatasetFormStrings.connectNewDataSourceDropDownOptionLabel();
    const connectOption = {
      value: CONNECT_NEW_DATA_SOURCE,
      inputDisplay: connectLabel,
      dropdownDisplay: (
        <div
          css={css({
            marginBlockStart: `calc(${euiTheme.size.s} * -1)`,
            marginInline: `calc(${euiTheme.size.m} * -1)`,
            paddingBlockStart: euiTheme.size.m,
            paddingInline: euiTheme.size.m,
            borderTop: `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`,
            textAlign: 'center',
            color: euiTheme.colors.textPrimary,
            fontWeight: euiTheme.font.weight.medium,
          })}
        >
          {connectLabel}
        </div>
      ),
      'data-test-subj': 'createDatasetDataSource-connectNew',
      showIndicator: false,
    };
    return [...fromSources, connectOption];
  }, [dataSources, euiTheme]);

  const onDataSourceChange = useCallback(
    (value: string) => {
      if (value === CONNECT_NEW_DATA_SOURCE) {
        setIsCreateDataSourceOpen(true);
        return;
      }
      dataSourceIdField.onChange(value);
    },
    [dataSourceIdField]
  );

  const onCloseCreateDataSource = useCallback(() => {
    setIsCreateDataSourceOpen(false);
  }, []);

  const onSaveCreateDataSource = useCallback(
    async (dataSource: DataSourceWithSecrets): Promise<string | null> => {
      try {
        await dataSourcesClient.add(dataSource);
        await loadDataSources();
        dataSourceIdField.onChange(dataSource.name);
        setIsCreateDataSourceOpen(false);
        return null;
      } catch (error) {
        return getFlyoutSaveErrorMessage(error);
      }
    },
    [dataSourceIdField, dataSourcesClient, loadDataSources]
  );

  return (
    <>
      <EuiFormRow
        label={createDatasetFormStrings.dataSourceLabel()}
        fullWidth
        isInvalid={Boolean(dataSourceFieldState.error)}
        error={dataSourceFieldState.error?.message}
      >
        <EuiSuperSelect
          options={dataSourceOptions}
          data-test-subj="createDatasetDataSource"
          fullWidth
          name={dataSourceIdField.name}
          aria-label={createDatasetFormStrings.dataSourceLabel()}
          valueOfSelected={isDataSourceEmpty ? undefined : dataSourceIdField.value}
          onChange={onDataSourceChange}
          onBlur={dataSourceIdField.onBlur}
          placeholder={createDatasetFormStrings.dataSourcePlaceholder()}
          isInvalid={Boolean(dataSourceFieldState.error)}
        />
      </EuiFormRow>
      <EuiFormRow
        label={createDatasetFormStrings.nameLabel()}
        helpText={createDatasetFormStrings.nameHelp()}
        fullWidth
        isInvalid={Boolean(nameFieldState.error)}
        error={nameFieldState.error?.message}
      >
        <EuiFieldText
          data-test-subj="createDatasetName"
          fullWidth
          placeholder={createDatasetFormStrings.namePlaceholder()}
          isInvalid={Boolean(nameFieldState.error)}
          value={nameField.value}
          onChange={(e) => nameField.onChange(e.target.value)}
          name={nameField.name}
          inputRef={nameField.ref}
        />
      </EuiFormRow>
      <EuiFormRow
        label={createDatasetFormStrings.descriptionLabel()}
        helpText={createDatasetFormStrings.descriptionHelp()}
        fullWidth
      >
        <EuiTextArea
          data-test-subj="createDatasetDescription"
          fullWidth
          rows={1}
          placeholder={createDatasetFormStrings.descriptionPlaceholder()}
          value={descriptionField.value}
          onChange={(e) => descriptionField.onChange(e.target.value)}
          name={descriptionField.name}
          inputRef={descriptionField.ref}
        />
      </EuiFormRow>
      <EuiFormRow
        label={createDatasetFormStrings.resourceLabel()}
        helpText={createDatasetFormStrings.resourceHelp()}
        fullWidth
        isInvalid={Boolean(resourceFieldState.error)}
        error={resourceFieldState.error?.message}
      >
        <EuiFieldText
          data-test-subj="createDatasetResource"
          fullWidth
          autoComplete="off"
          isInvalid={Boolean(resourceFieldState.error)}
          value={resourceField.value}
          onChange={(e) => resourceField.onChange(e.target.value)}
          name={resourceField.name}
          inputRef={resourceField.ref}
        />
      </EuiFormRow>
      {isCreateDataSourceOpen ? (
        <CreateDataSourceFlyout
          existingDataSourceNames={existingDataSourceNames}
          onClose={onCloseCreateDataSource}
          onSave={onSaveCreateDataSource}
        />
      ) : null}
    </>
  );
}
