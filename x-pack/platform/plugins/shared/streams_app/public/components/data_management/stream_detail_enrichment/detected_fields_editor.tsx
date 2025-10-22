/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useEuiTheme, EuiEmptyPrompt, EuiText, EuiCallOut, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { Streams } from '@kbn/streams-schema';
import { uniq } from 'lodash';
import { AssetImage } from '../../asset_image';
import { SchemaEditor } from '../schema_editor';
import type { SchemaField } from '../schema_editor/types';
import {
  useStreamEnrichmentEvents,
  useStreamEnrichmentSelector,
} from './state_management/stream_enrichment_state_machine';
import { isSelectableField } from '../schema_editor/schema_editor_table';

interface DetectedFieldsEditorProps {
  detectedFields: SchemaField[];
  validationResult: any;
}

export const DetectedFieldsEditor = ({
  detectedFields,
  validationResult,
}: DetectedFieldsEditorProps) => {
  const { euiTheme } = useEuiTheme();

  const { mapField, unmapField } = useStreamEnrichmentEvents();
  const definition = useStreamEnrichmentSelector((state) => state.context.definition);

  const isWiredStream = Streams.WiredStream.GetResponse.is(definition);
  const [selectedFields, setSelectedFields] = React.useState<string[]>(
    detectedFields
      .filter((field) => isSelectableField(definition.stream.name, field))
      .map(({ name }) => name)
  );

  const hasFields = detectedFields.length > 0;

  if (!hasFields) {
    if (validationResult.name === 'ConditionalTypeChangeError') {
      return (
        <EuiCallOut announceOnMount color="danger">
          {i18n.translate('xpack.streams.detectedFieldsEditor.fieldCallOutLabel', {
            defaultMessage: 'Field',
          })}{' '}
          <b>{validationResult.field}</b>{' '}
          {i18n.translate(
            'xpack.streams.detectedFieldsEditor.conditionallyChangesFromCallOutLabel',
            { defaultMessage: 'conditionally changes from' }
          )}{' '}
          <b>{validationResult.types[0]}</b>{' '}
          {i18n.translate('xpack.streams.detectedFieldsEditor.toCallOutLabel', {
            defaultMessage: 'to',
          })}{' '}
          <b>{validationResult.types[1]}</b>{' '}
          {i18n.translate('xpack.streams.detectedFieldsEditor.ThisMightLeadCallOutLabel', {
            defaultMessage: '- this might lead to type conflicts in production.',
          })}
        </EuiCallOut>
      );
    }
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
      {validationResult.name === 'ConditionalTypeChangeError' && (
        <>
          <EuiCallOut announceOnMount color="danger">
            {i18n.translate('xpack.streams.detectedFieldsEditor.fieldCallOutLabel', {
              defaultMessage: 'Field',
            })}{' '}
            <b>{validationResult.field}</b>{' '}
            {i18n.translate(
              'xpack.streams.detectedFieldsEditor.conditionallyChangesFromCallOutLabel',
              { defaultMessage: 'conditionally changes from' }
            )}{' '}
            <b>{validationResult.types[0]}</b>{' '}
            {i18n.translate('xpack.streams.detectedFieldsEditor.toCallOutLabel', {
              defaultMessage: 'to',
            })}{' '}
            <b>{validationResult.types[1]}</b>{' '}
            {i18n.translate('xpack.streams.detectedFieldsEditor.ThisMightLeadCallOutLabel', {
              defaultMessage: '- this might lead to type conflicts in production.',
            })}
          </EuiCallOut>
          <EuiSpacer />
        </>
      )}

      <SchemaEditor
        defaultColumns={['name', 'type', 'format', 'status', 'source']}
        fields={detectedFields}
        stream={definition.stream}
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
