/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink, EuiFormRow, EuiSuperSelect, EuiSuperSelectProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useController, useFormContext, useWatch } from 'react-hook-form';
import { ProcessorType } from '@kbn/streams-schema';
import { useKibana } from '../../../../hooks/use_kibana';
import { getDefaultFormStateByType } from '../utils';
import { ProcessorFormState } from '../types';
import { configDrivenProcessors } from './config_driven';
import { useGetStreamEnrichmentState } from '../state_management/stream_enrichment_state_machine';
import { selectPreviewDocuments } from '../state_management/simulation_state_machine/selectors';
import { useStreamEnrichmentSelector } from '../state_management/stream_enrichment_state_machine';

interface TAvailableProcessor {
  type: ProcessorType;
  inputDisplay: string;
  getDocUrl: (esDocUrl: string) => React.ReactNode;
}

type TAvailableProcessors = Record<ProcessorType, TAvailableProcessor>;

export const ProcessorTypeSelector = ({
  disabled = false,
}: Pick<EuiSuperSelectProps, 'disabled'>) => {
  const { core } = useKibana();
  const esDocUrl = core.docLinks.links.elasticsearch.docsBase;
  const getEnrichmentState = useGetStreamEnrichmentState();

  const { reset } = useFormContext();
  const { field, fieldState } = useController<ProcessorFormState, 'type'>({
    name: 'type',
    rules: { required: true },
  });

  const processorType = useWatch<{ type: ProcessorType }>({ name: 'type' });

  const grokCollection = useStreamEnrichmentSelector((state) => state.context.grokCollection);

  const handleChange = (type: ProcessorType) => {
    const formState = getDefaultFormStateByType(
      type,
      selectPreviewDocuments(getEnrichmentState().context.simulatorRef?.getSnapshot().context),
      { grokCollection }
    );
    reset(formState);
  };

  return (
    <EuiFormRow
      fullWidth
      label={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.typeSelectorLabel',
        { defaultMessage: 'Processor' }
      )}
      helpText={getProcessorDescription(esDocUrl)(processorType)}
    >
      <EuiSuperSelect
        disabled={disabled}
        options={processorTypeSelectorOptions}
        isInvalid={fieldState.invalid}
        valueOfSelected={field.value}
        onChange={handleChange}
        fullWidth
        placeholder={i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processor.typeSelectorPlaceholder',
          { defaultMessage: 'Grok, Dissect ...' }
        )}
      />
    </EuiFormRow>
  );
};

const availableProcessors: TAvailableProcessors = {
  date: {
    type: 'date',
    inputDisplay: 'Date',
    getDocUrl: () => (
      <FormattedMessage
        id="xpack.streams.streamDetailView.managementTab.enrichment.processor.dateHelpText"
        defaultMessage="Converts a date to a document timestamp."
      />
    ),
  },
  dissect: {
    type: 'dissect',
    inputDisplay: 'Dissect',
    getDocUrl: (esDocUrl: string) => (
      <FormattedMessage
        id="xpack.streams.streamDetailView.managementTab.enrichment.processor.dissectHelpText"
        defaultMessage="Uses {dissectLink} patterns to extract matches from a field."
        values={{
          dissectLink: (
            <EuiLink
              data-test-subj="streamsAppAvailableProcessorsDissectLink"
              external
              target="_blank"
              href={esDocUrl + 'dissect-processor.html'}
            >
              {i18n.translate('xpack.streams.availableProcessors.dissectLinkLabel', {
                defaultMessage: 'dissect',
              })}
            </EuiLink>
          ),
        }}
      />
    ),
  },
  grok: {
    type: 'grok',
    inputDisplay: 'Grok',
    getDocUrl: (esDocUrl: string) => (
      <FormattedMessage
        id="xpack.streams.streamDetailView.managementTab.enrichment.processor.grokHelpText"
        defaultMessage="Uses {grokLink} expressions to extract matches from a field."
        values={{
          grokLink: (
            <EuiLink
              data-test-subj="streamsAppAvailableProcessorsGrokLink"
              external
              target="_blank"
              href={esDocUrl + 'grok-processor.html'}
            >
              {i18n.translate('xpack.streams.availableProcessors.grokLinkLabel', {
                defaultMessage: 'grok',
              })}
            </EuiLink>
          ),
        }}
      />
    ),
  },
  ...configDrivenProcessors,
  manual_ingest_pipeline: {
    type: 'manual_ingest_pipeline',
    inputDisplay: 'Manual pipeline configuration',
    getDocUrl: () => (
      <FormattedMessage
        id="xpack.streams.streamDetailView.managementTab.enrichment.processor.manualIngestPipelineHelpText"
        defaultMessage="Specify an array of ingest pipeline processors using JSON."
      />
    ),
  },
};

const getProcessorDescription = (esDocUrl: string) => (type: ProcessorType) =>
  availableProcessors[type].getDocUrl(esDocUrl);

const processorTypeSelectorOptions = Object.values(availableProcessors).map(
  ({ type, inputDisplay }) => ({ value: type, inputDisplay })
);
