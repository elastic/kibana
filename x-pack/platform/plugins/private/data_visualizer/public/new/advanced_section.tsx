/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiCheckbox,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
} from '@elastic/eui';
import type { FC } from 'react';
import React from 'react';
import type {
  IndicesIndexSettings,
  MappingTypeMapping,
} from '@elastic/elasticsearch/lib/api/types';

import { FormattedMessage } from '@kbn/i18n-react';
import { Mappings } from './file_status/mappings';
import { Settings } from './file_status/settings';
import { CreateDataViewToolTip } from '../application/file_data_visualizer/components/import_settings/create_data_view_tooltip';

interface Props {
  mappings: MappingTypeMapping | null;
  setMappings: (mappings: string) => void;
  settings: IndicesIndexSettings;
  setSettings: (settings: string) => void;
  canCreateDataView?: boolean;
  indexName: string;
  dataViewName: string | null;
  setDataViewName: (dataViewName: string | null) => void;
  dataViewNameError: string;
}

export const AdvancedSection: FC<Props> = ({
  mappings,
  setMappings,
  setSettings,
  settings,
  canCreateDataView = true,
  indexName,
  dataViewName,
  setDataViewName,
  dataViewNameError,
}) => {
  return (
    <EuiAccordion id={'advancedSection'} buttonContent="Advanced" paddingSize="m">
      <EuiFlexGroup>
        <EuiFlexItem>
          <Mappings mappings={mappings ?? {}} setMappings={setMappings} />
        </EuiFlexItem>
        <EuiFlexItem>
          <Settings settings={settings ?? {}} setSettings={setSettings} />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer />

      <CreateDataViewToolTip showTooltip={canCreateDataView === false}>
        <EuiCheckbox
          id="createDataView"
          label={
            <FormattedMessage
              id="xpack.dataVisualizer.file.advancedImportSettings.createDataViewLabel"
              defaultMessage="Create data view"
            />
          }
          checked={dataViewName === null ? false : true}
          disabled={canCreateDataView === false}
          onChange={(e) => setDataViewName(e.target.checked ? '' : null)}
        />
      </CreateDataViewToolTip>

      <EuiSpacer size="s" />

      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.dataVisualizer.file.advancedImportSettings.dataViewNameLabel"
            defaultMessage="Data view name"
          />
        }
        isInvalid={dataViewNameError !== ''}
        error={[dataViewNameError]}
      >
        <EuiFieldText
          disabled={dataViewName === null}
          placeholder={dataViewName === null ? '' : indexName}
          value={dataViewName ?? ''}
          onChange={(e) => setDataViewName(e.target.value)}
          isInvalid={dataViewNameError !== ''}
        />
      </EuiFormRow>
    </EuiAccordion>
  );
};
