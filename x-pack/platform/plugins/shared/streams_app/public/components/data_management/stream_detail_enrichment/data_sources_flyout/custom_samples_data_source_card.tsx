/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiSpacer, EuiFormRow } from '@elastic/eui';
import { CodeEditor } from '@kbn/code-editor';
import { isSchema } from '@kbn/streams-schema';
import { useResizeChecker } from '@kbn/react-hooks';
import { customSamplesDataSourceDocumentsSchema } from '../../../../../common/url_schema';
import type { DataSourceActorRef } from '../state_management/data_source_state_machine';
import { useDataSourceSelector } from '../state_management/data_source_state_machine';
import type { CustomSamplesDataSourceWithUIAttributes } from '../types';
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

  const { containerRef, setupResizeChecker, destroyResizeChecker } = useResizeChecker();

  const handleChange = (params: Partial<CustomSamplesDataSourceWithUIAttributes>) => {
    dataSourceRef.send({ type: 'dataSource.change', dataSource: { ...dataSource, ...params } });
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
    >
      <div style={{ minWidth: 0 }}>
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
          style={{ minWidth: 0, maxWidth: '100%', flex: '1 1 auto', boxSizing: 'border-box' }}
        >
          <div
            ref={containerRef}
            style={{
              width: '100%',
              height: 200,
              overflow: 'hidden',
              minWidth: 0,
              maxWidth: '100%',
              flex: '1 1 0%',
              boxSizing: 'border-box',
            }}
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
              }}
              editorDidMount={(editor) => setupResizeChecker(editor, { flyoutMode: true })}
              editorWillUnmount={() => destroyResizeChecker()}
            />
          </div>
        </EuiFormRow>
        <EuiSpacer size="m" />
      </div>
    </DataSourceCard>
  );
};
