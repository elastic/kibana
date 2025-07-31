/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useController } from 'react-hook-form';
import { EuiFormRow, EuiLink } from '@elastic/eui';
import { CodeEditor } from '@kbn/code-editor';
import { i18n } from '@kbn/i18n';
import { ElasticsearchProcessorType, elasticsearchProcessorTypes } from '@kbn/streams-schema';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '../../../../../hooks/use_kibana';
import { ProcessorFormState } from '../../types';
import { deserializeJson, serializeXJson } from '../../helpers';

export const JsonEditor = () => {
  const {
    core: { docLinks },
  } = useKibana();
  const { field, fieldState } = useController<ProcessorFormState, 'processors'>({
    name: 'processors',
    rules: {
      validate: (value) => {
        if (typeof value === 'string') {
          return i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.processor.ingestPipelineProcessorsInvalidJSON',
            {
              defaultMessage: 'Invalid JSON format',
            }
          );
        }
        if (!Array.isArray(value)) {
          return i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.processor.ingestPipelineProcessorsInvalidArray',
            {
              defaultMessage: 'Expected an array',
            }
          );
        }
        const invalidProcessor = value.find((processor) => {
          const processorType = Object.keys(processor)[0];
          return !elasticsearchProcessorTypes.includes(processorType as ElasticsearchProcessorType);
        });
        if (invalidProcessor) {
          return i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.processor.ingestPipelineProcessorsInvalidProcessorType',
            {
              defaultMessage: 'Invalid processor type: {processorType}',
              values: {
                processorType: Object.keys(invalidProcessor)[0],
              },
            }
          );
        }
      },
    },
  });

  return (
    <EuiFormRow
      label={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.ingestPipelineProcessorsLabel',
        { defaultMessage: 'Ingest pipeline processors' }
      )}
      helpText={
        <FormattedMessage
          id="xpack.streams.streamDetailView.managementTab.enrichment.processor.ingestPipelineProcessorsHelpText"
          defaultMessage={
            'A JSON-encoded array of {ingestPipelineProcessors}. {conditions} defined in the processor JSON take precedence over conditions defined in "Optional fields".'
          }
          values={{
            ingestPipelineProcessors: (
              <EuiLink href={docLinks.links.ingest.processors} target="_blank" external>
                {i18n.translate(
                  'xpack.streams.streamDetailView.managementTab.enrichment.processor.ingestPipelineProcessorsLabel',
                  { defaultMessage: 'ingest pipeline processors' }
                )}
              </EuiLink>
            ),
            conditions: (
              <EuiLink href={docLinks.links.ingest.conditionalProcessor} target="_blank" external>
                {i18n.translate(
                  'xpack.streams.streamDetailView.managementTab.enrichment.processor.ingestPipelineProcessorsConditionallyLabel',
                  { defaultMessage: 'Conditions' }
                )}
              </EuiLink>
            ),
          }}
        />
      }
      error={fieldState.error?.message}
      isInvalid={fieldState.invalid}
      fullWidth
    >
      <CodeEditor
        value={serializeXJson(field.value, '[]')}
        onChange={(value) => field.onChange(deserializeJson(value))}
        languageId="xjson"
        height={200}
        aria-label={i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processor.ingestPipelineProcessorsAriaLabel',
          { defaultMessage: 'Ingest pipeline processors editor' }
        )}
      />
    </EuiFormRow>
  );
};
