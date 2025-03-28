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
import React, { useState } from 'react';
import type {
  IndicesIndexSettings,
  MappingTypeMapping,
} from '@elastic/elasticsearch/lib/api/types';

import { FormattedMessage } from '@kbn/i18n-react';
import type { IngestPipeline } from '@kbn/file-upload-plugin/common';
import { Mappings } from './file_status/mappings';
import { Settings } from './file_status/settings';
import { CreateDataViewToolTip } from '../application/file_data_visualizer/components/import_settings/create_data_view_tooltip';
import type { CombinedField } from '../application/common/components/combined_fields';
import { CombinedFieldsForm } from '../application/common/components/combined_fields';
import type { FileAnalysis } from './file_manager/file_wrapper';

interface Props {
  mappings: MappingTypeMapping | null;
  setMappings: (mappings: string) => void;
  settings: IndicesIndexSettings;
  setSettings: (settings: string) => void;
  pipelines: Array<IngestPipeline | undefined>;
  setPipelines: (pipelines: IngestPipeline[]) => void;
  canCreateDataView?: boolean;
  indexName: string;
  dataViewName: string | null;
  setDataViewName: (dataViewName: string | null) => void;
  dataViewNameError: string;
  results: any;
  filesStatus: FileAnalysis[];
}

export const AdvancedSection: FC<Props> = ({
  mappings,
  setMappings,
  pipelines,
  setPipelines,
  setSettings,
  settings,
  canCreateDataView = true,
  indexName,
  dataViewName,
  setDataViewName,
  dataViewNameError,
  results,
  filesStatus,
}) => {
  const [combinedFields, setCombinedFields] = useState<CombinedField[]>([]);
  return (
    <EuiAccordion id={'advancedSection'} buttonContent="Advanced" paddingSize="m">
      <EuiFlexGroup>
        <EuiFlexItem>
          <Mappings mappings={mappings ?? {}} setMappings={(m) => setMappings(m)} />
        </EuiFlexItem>
        <EuiFlexItem>
          <Settings settings={settings ?? {}} setSettings={(s) => setSettings(s)} />
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

      <EuiSpacer />

      <CombinedFieldsForm
        mappings={mappings!}
        onMappingsChange={(m) => setMappings(m)}
        pipelines={pipelines as IngestPipeline[]}
        onPipelinesChange={(p) => setPipelines(p)}
        combinedFields={combinedFields}
        onCombinedFieldsChange={(f) => setCombinedFields(f)}
        isDisabled={false}
        filesStatus={filesStatus}
        // isDisabled={initialized === true}
      />
    </EuiAccordion>
  );
};
