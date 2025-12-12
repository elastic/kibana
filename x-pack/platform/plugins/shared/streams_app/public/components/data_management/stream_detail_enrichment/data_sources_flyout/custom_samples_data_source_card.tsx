/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer, EuiFormRow } from '@elastic/eui';
import { CodeEditor } from '@kbn/code-editor';
import { isSchema } from '@kbn/streams-schema';
import { useDebounceFn } from '@kbn/react-hooks';
import { customSamplesDataSourceDocumentsSchema } from '../../../../../common/url_schema';
import type { DataSourceActorRef } from '../state_management/data_source_state_machine';
import { useDataSourceSelector } from '../state_management/data_source_state_machine';
import type { CustomSamplesDataSourceWithUIAttributes } from '../types';
import { deserializeJson, serializeXJson } from '../helpers';
import { DataSourceCard } from './data_source_card';
import { NameField } from './name_field';
import { DATA_SOURCES_I18N } from './translations';
import { dataSourceConverter } from '../utils';

const debounceOptions = { wait: 500 };
interface CustomSamplesDataSourceCardProps {
  readonly dataSourceRef: DataSourceActorRef;
}

export const CustomSamplesDataSourceCard = ({
  dataSourceRef,
}: CustomSamplesDataSourceCardProps) => {
  const dataSource = useDataSourceSelector(
    dataSourceRef,
    (snapshot) => snapshot.context.dataSource as CustomSamplesDataSourceWithUIAttributes
  );

  const isDisabled = useDataSourceSelector(
    dataSourceRef,
    (snapshot) => !snapshot.can({ type: 'dataSource.change', dataSource })
  );

  const { run: handleStorageUpdate } = useDebounceFn(
    (newDataSource: CustomSamplesDataSourceWithUIAttributes) => {
      if (newDataSource.storageKey) {
        const urlSchemaDataSource = dataSourceConverter.toUrlSchema(newDataSource);
        sessionStorage.setItem(newDataSource.storageKey, JSON.stringify(urlSchemaDataSource));
      }
    },
    debounceOptions
  );

  const handleChange = (updates: Partial<CustomSamplesDataSourceWithUIAttributes>) => {
    const newDataSource = { ...dataSource, ...updates };
    dataSourceRef.send({ type: 'dataSource.change', dataSource: newDataSource });
    handleStorageUpdate(newDataSource);
  };

  /**
   * To have the editor properly handle the set xjson language
   * we need to avoid the continuous parsing/serialization of the editor value
   * using a parallel state always setting a string make the editor format well the content.
   */
  const [editorValue, setEditorValue] = React.useState(() =>
    serializeXJson(dataSource.documents, '[]')
  );

  const handleEditorChange = (value: string) => {
    setEditorValue(value);
    const documents = deserializeJson(value);
    if (isSchema(customSamplesDataSourceDocumentsSchema, documents)) {
      handleChange({ documents });
    }
  };

  return (
    <DataSourceCard
      dataSourceRef={dataSourceRef}
      title={DATA_SOURCES_I18N.customSamples.defaultName}
      subtitle={DATA_SOURCES_I18N.customSamples.subtitle}
      isForCompleteSimulation
    >
      <NameField
        onChange={(event) => handleChange({ name: event.target.value })}
        value={dataSource.name}
        disabled={isDisabled}
        data-test-subj="streamsAppCustomSamplesDataSourceNameField"
      />
      <EuiFormRow
        label={DATA_SOURCES_I18N.customSamples.label}
        helpText={DATA_SOURCES_I18N.customSamples.helpText}
        isDisabled={isDisabled}
        fullWidth
      >
        <CodeEditor
          dataTestSubj="streamsAppCustomSamplesDataSourceEditor"
          height={200}
          value={editorValue}
          onChange={handleEditorChange}
          languageId="xjson"
          options={{
            tabSize: 2,
            readOnly: isDisabled,
            automaticLayout: true,
          }}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
    </DataSourceCard>
  );
};
