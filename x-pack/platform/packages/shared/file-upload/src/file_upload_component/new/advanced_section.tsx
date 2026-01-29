/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiFieldText,
  EuiFormRow,
  EuiSpacer,
  EuiSwitch,
  EuiTitle,
} from '@elastic/eui';
import type { FC, PropsWithChildren } from 'react';
import React, { useState } from 'react';
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';

import { FormattedMessage } from '@kbn/i18n-react';
import type { IngestPipeline } from '@kbn/file-upload-common';
import { Mappings } from './file_status/mappings';
import { Settings } from './file_status/settings';
import { CreateDataViewToolTip } from './create_data_view_tooltip';
import type { CombinedField } from './combined_fields';
import { CombinedFieldsForm } from './combined_fields';
import { useFileUploadContext, UPLOAD_TYPE } from '../../use_file_upload';

interface Props {
  canCreateDataView?: boolean;
}

export const AdvancedSection: FC<Props> = ({ canCreateDataView = true }) => {
  const {
    filesStatus,
    fileUploadManager,
    pipelines,
    setDataViewName,
    indexName,
    mappings,
    settings,
    dataViewName,
    dataViewNameError,
    indexCreateMode,
  } = useFileUploadContext();
  const [combinedFields, setCombinedFields] = useState<CombinedField[]>([]);
  return (
    <EuiAccordion
      id={'advancedSection'}
      buttonContent={
        <FormattedMessage
          id="xpack.fileUpload.advancedOptionsTitle"
          defaultMessage="Advanced options"
        />
      }
      paddingSize="m"
      data-test-subj="dataVisualizerAdvancedSettingsAccordion"
    >
      <SectionTitle>
        <FormattedMessage id="xpack.fileUpload.mappingsTitle" defaultMessage="Mappings" />
      </SectionTitle>

      <Mappings
        mappings={mappings?.json ?? {}}
        setMappings={(m) => fileUploadManager.updateMappings(m)}
        showTitle={true}
        fileCount={filesStatus.length}
        showBorder={true}
      />

      <EuiSpacer />

      <CombinedFieldsForm
        mappings={mappings!.json as MappingTypeMapping}
        onMappingsChange={(m) => fileUploadManager.updateMappings(m)}
        pipelines={pipelines as IngestPipeline[]}
        onPipelinesChange={(p) => fileUploadManager.updatePipelines(p)}
        combinedFields={combinedFields}
        onCombinedFieldsChange={(f) => setCombinedFields(f)}
        isDisabled={false}
        filesStatus={filesStatus}
      />

      {indexCreateMode === UPLOAD_TYPE.NEW ? (
        <>
          <EuiSpacer />

          <SectionTitle>
            <FormattedMessage id="xpack.fileUpload.dataViewTitle" defaultMessage="Data view" />
          </SectionTitle>

          <CreateDataViewToolTip showTooltip={canCreateDataView === false}>
            <EuiSwitch
              data-test-subj="dataVisualizerCreateDataViewSwitch"
              id="createDataView"
              label={
                <FormattedMessage
                  id="xpack.fileUpload.advancedImportSettings.createDataViewLabel"
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
                id="xpack.fileUpload.advancedImportSettings.dataViewNameLabel"
                defaultMessage="Data view name"
              />
            }
            helpText={
              <FormattedMessage
                id="xpack.fileUpload.advancedImportSettings.dataViewNameHelpText"
                defaultMessage="By default data view will have the same name as the new index."
              />
            }
            isInvalid={dataViewNameError !== ''}
            error={[dataViewNameError]}
          >
            <EuiFieldText
              data-test-subj="dataVisualizerDataViewNameInput"
              disabled={dataViewName === null}
              placeholder={dataViewName === null ? '' : indexName}
              value={dataViewName ?? ''}
              onChange={(e) => setDataViewName(e.target.value)}
              isInvalid={dataViewNameError !== ''}
            />
          </EuiFormRow>
        </>
      ) : null}

      <EuiSpacer />

      <SectionTitle>
        <FormattedMessage
          id="xpack.fileUpload.indexSettingsTitle"
          defaultMessage="Index settings"
        />
      </SectionTitle>

      <Settings
        settings={settings?.json ?? {}}
        setSettings={(s) => fileUploadManager.updateSettings(s)}
      />
    </EuiAccordion>
  );
};

const SectionTitle: FC<PropsWithChildren<{}>> = ({ children }) => (
  <>
    <EuiTitle size="s">
      <h3>{children}</h3>
    </EuiTitle>

    <EuiSpacer size="m" />
  </>
);
