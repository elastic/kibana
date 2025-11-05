/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiCallOut, EuiSpacer, EuiFormRow } from '@elastic/eui';
import { CodeEditor } from '@kbn/code-editor';
import { isSchema } from '@kbn/streams-schema';
import { customSamplesDataSourceDocumentsSchema } from '../../../../../common/url_schema';
import {
  DataSourceActorRef,
  useDataSourceSelector,
} from '../state_management/data_source_state_machine';
import { CustomSamplesDataSourceWithUIAttributes } from '../types';
import { deserializeJson, serializeXJson } from '../helpers';
import { DataSourceCard } from './data_source_card';
import { NameField } from './name_field';
import { DATA_SOURCES_I18N } from './translations';

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

  const isDisabled = useDataSourceSelector(dataSourceRef, (snapshot) =>
    snapshot.matches('disabled')
  );

  const handleChange = (params: Partial<CustomSamplesDataSourceWithUIAttributes>) => {
    dataSourceRef.send({ type: 'dataSource.change', dataSource: { ...dataSource, ...params } });
  };

  const editorValue = useMemo(
    () => serializeXJson(dataSource.documents, '[]'),
    [dataSource.documents]
  );
  const handleEditorChange = (value: string) => {
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
    >
      <EuiCallOut iconType="info" size="s" title={DATA_SOURCES_I18N.customSamples.callout} />
      <EuiSpacer size="m" />
      <NameField
        onChange={(event) => handleChange({ name: event.target.value })}
        value={dataSource.name}
        disabled={isDisabled}
      />
      <EuiFormRow
        label={DATA_SOURCES_I18N.customSamples.label}
        helpText={DATA_SOURCES_I18N.customSamples.helpText}
        isDisabled={isDisabled}
        fullWidth
      >
        <CodeEditor
          height={200}
          value={editorValue}
          onChange={handleEditorChange}
          languageId="xjson"
          options={{
            tabSize: 2,
            automaticLayout: true,
            readOnly: isDisabled,
          }}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
    </DataSourceCard>
  );
};
