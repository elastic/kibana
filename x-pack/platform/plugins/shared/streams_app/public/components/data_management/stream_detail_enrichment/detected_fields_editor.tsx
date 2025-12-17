/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useEuiTheme, EuiEmptyPrompt, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { Streams } from '@kbn/streams-schema';
import { uniq } from 'lodash';
import { AssetImage } from '../../asset_image';
import { SchemaEditor } from '../schema_editor';
import type { SchemaEditorField } from '../schema_editor/types';
import {
  useStreamEnrichmentEvents,
  useStreamEnrichmentSelector,
} from './state_management/stream_enrichment_state_machine';
import { isSelectableField } from '../schema_editor/schema_editor_table';

interface DetectedFieldsEditorProps {
  schemaEditorFields: SchemaEditorField[];
}

export const DetectedFieldsEditor = ({ schemaEditorFields }: DetectedFieldsEditorProps) => {
  const { euiTheme } = useEuiTheme();

  const { mapField, unmapField } = useStreamEnrichmentEvents();

  const definition = useStreamEnrichmentSelector((state) => state.context.definition);
  const isWiredStream = Streams.WiredStream.GetResponse.is(definition);
  const [selectedFields, setSelectedFields] = React.useState<string[]>(
    schemaEditorFields
      .filter((field) => isSelectableField(definition.stream.name, field))
      .map(({ name }) => name)
  );

  const hasFields = schemaEditorFields.length > 0;

  if (!hasFields) {
    return (
      <EuiEmptyPrompt
        titleSize="xs"
        icon={<AssetImage type="noResults" />}
        body={
          <p>
            {i18n.translate(
              'xpack.streams.streamDetailView.managementTab.enrichment.simulationPlayground.detectedFields.noResults.content',
              {
                defaultMessage: 'No fields were detected. Add fields manually from the Schema tab.',
              }
            )}
          </p>
        }
      />
    );
  }

  return (
    <>
      {isWiredStream && (
        <EuiText
          component="p"
          color="subdued"
          size="xs"
          css={css`
            margin-bottom: ${euiTheme.size.base};
          `}
        >
          {i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.simulationPlayground.detectedFieldsHeadline',
            {
              defaultMessage: 'You can review and adjust saved fields further in the Schema tab.',
            }
          )}
        </EuiText>
      )}
      <SchemaEditor
        defaultColumns={['name', 'type', 'format', 'status', 'result']}
        fields={schemaEditorFields}
        stream={definition.stream}
        // Geo-point helpers are disabled in the Processing tab for now
        // We will enable it once we add geo_point support for wired.
        enableGeoPointSuggestions={false}
        onFieldUpdate={(field) => {
          if (field.status === 'mapped') {
            mapField(field);
          } else if (field.status === 'unmapped') {
            unmapField(field.name);
          }
        }}
        onFieldSelection={(names, checked) => {
          setSelectedFields((selection) => {
            if (checked) {
              return uniq([...selection, ...names]);
            } else {
              return selection.filter((name) => !names.includes(name));
            }
          });
        }}
        fieldSelection={selectedFields}
        withControls
        withTableActions
      />
    </>
  );
};
