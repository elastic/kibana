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
import { WiredStreamGetResponse } from '@kbn/streams-schema';
import { AssetImage } from '../../asset_image';
import { SchemaEditor } from '../schema_editor';
import { SchemaField } from '../schema_editor/types';
import { useStreamEnrichmentEvents } from './state_management/stream_enrichment_state_machine';

interface DetectedFieldsEditorProps {
  definition: WiredStreamGetResponse;
  detectedFields: SchemaField[];
}

export const DetectedFieldsEditor = ({ definition, detectedFields }: DetectedFieldsEditorProps) => {
  const { euiTheme } = useEuiTheme();

  const { mapField, unmapField } = useStreamEnrichmentEvents();

  const hasFields = detectedFields.length > 0;

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
                defaultMessage:
                  'No fields were detected during the simulation. You can add fields manually in the Schema Editor.',
              }
            )}
          </p>
        }
      />
    );
  }

  return (
    <>
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
          { defaultMessage: 'You can review and adjust saved fields further in the Schema Editor.' }
        )}
      </EuiText>
      <SchemaEditor
        defaultColumns={['name', 'type', 'format', 'status']}
        fields={detectedFields}
        stream={definition.stream}
        onFieldUnmap={unmapField}
        onFieldUpdate={mapField}
        withTableActions
      />
    </>
  );
};
