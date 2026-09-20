/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSuperSelect,
  useEuiTheme,
  type EuiSuperSelectOption,
} from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';

import type { DataSource, DataSourceWithSecrets } from '../../../common';
import { DATA_SOURCE_TYPES_TO_ICONS } from '../../../common';
import { CreateDataSourceFlyout } from '../../create_data_source_flyout';
import { getFlyoutSaveErrorMessage } from '../../get_flyout_save_error_message';
import type { DataFederationKibanaServices } from '../../types';
import { createDatasetWizardStrings } from '../create_dataset_wizard_i18n';

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

export function DataSourceSelect({
  dataSources,
  value,
  isInvalid,
  onChange,
  onBlur,
  loadDataSources,
}: {
  dataSources: DataSource[];
  value: string;
  isInvalid: boolean;
  onChange: (value: string) => void;
  onBlur: () => void;
  loadDataSources: () => Promise<void>;
}) {
  const { euiTheme } = useEuiTheme();
  const {
    services: { dataSourcesClient },
  } = useKibana<DataFederationKibanaServices>();
  const [isCreateDataSourceOpen, setIsCreateDataSourceOpen] = useState(false);

  const existingDataSourceNames = useMemo(
    () => dataSources.map((dataSource) => dataSource.name),
    [dataSources]
  );

  const options = useMemo((): Array<EuiSuperSelectOption<string>> => {
    const fromSources = dataSources.map((dataSource) => {
      const display = dataSourceOptionDisplay(dataSource);
      return {
        value: dataSource.name,
        inputDisplay: display,
        dropdownDisplay: display,
        'data-test-subj': `createDatasetDataSource-${dataSource.name}`,
      };
    });
    const connectLabel = createDatasetWizardStrings.connectNewDataSourceDropDownOptionLabel;
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

  const onSelectChange = useCallback(
    (nextValue: string) => {
      if (nextValue === CONNECT_NEW_DATA_SOURCE) {
        setIsCreateDataSourceOpen(true);
        return;
      }
      onChange(nextValue);
    },
    [onChange]
  );

  const onCloseCreateDataSource = useCallback(() => {
    setIsCreateDataSourceOpen(false);
  }, []);

  const onSaveCreateDataSource = useCallback(
    async (dataSource: DataSourceWithSecrets): Promise<string | null> => {
      try {
        await dataSourcesClient.add(dataSource);
        await loadDataSources();
        onChange(dataSource.name);
        setIsCreateDataSourceOpen(false);
        return null;
      } catch (error) {
        return getFlyoutSaveErrorMessage(error);
      }
    },
    [dataSourcesClient, loadDataSources, onChange]
  );

  return (
    <>
      <EuiSuperSelect
        options={options}
        data-test-subj="createDatasetDataSource"
        fullWidth
        name="data_source"
        aria-label={createDatasetWizardStrings.dataSourceLabel}
        valueOfSelected={value ? value : undefined}
        onChange={onSelectChange}
        onBlur={onBlur}
        placeholder={createDatasetWizardStrings.dataSourcePlaceholder}
        isInvalid={isInvalid}
      />
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
