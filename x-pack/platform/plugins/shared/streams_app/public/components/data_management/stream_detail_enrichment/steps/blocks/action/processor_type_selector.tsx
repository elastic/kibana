/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiSuperSelectProps } from '@elastic/eui';
import { EuiLink, EuiFormRow, EuiSuperSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useController, useFormContext, useWatch } from 'react-hook-form';
import type { DocLinksStart } from '@kbn/core/public';
import type { ProcessorType } from '@kbn/streamlang';
import { Streams } from '@kbn/streams-schema';
import { useKibana } from '../../../../../../hooks/use_kibana';
import { getDefaultFormStateByType } from '../../../utils';
import type { ProcessorFormState } from '../../../types';
import { configDrivenProcessors } from './config_driven';
import { useGetStreamEnrichmentState } from '../../../state_management/stream_enrichment_state_machine';
import { selectPreviewRecords } from '../../../state_management/simulation_state_machine/selectors';
import { useStreamEnrichmentSelector } from '../../../state_management/stream_enrichment_state_machine';

interface TAvailableProcessor {
  type: ProcessorType;
  inputDisplay: string;
  getDocUrl: (docLinks: DocLinksStart) => React.ReactNode;
}

type TAvailableProcessors = Record<ProcessorType, TAvailableProcessor>;

export const ProcessorTypeSelector = ({
  disabled = false,
}: Pick<EuiSuperSelectProps, 'disabled'>) => {
  const { core } = useKibana();
  const getEnrichmentState = useGetStreamEnrichmentState();

  const { reset } = useFormContext();
  const { field, fieldState } = useController<ProcessorFormState, 'action'>({
    name: 'action',
    rules: { required: true },
  });

  const processorType = useWatch<{ action: ProcessorType }>({ name: 'action' });
  const isWired = useStreamEnrichmentSelector((snapshot) =>
    Streams.WiredStream.GetResponse.is(snapshot.context.definition)
  );

  const grokCollection = useStreamEnrichmentSelector((state) => state.context.grokCollection);

  const handleChange = (type: ProcessorType) => {
    const formState = getDefaultFormStateByType(
      type,
      selectPreviewRecords(getEnrichmentState().context.simulatorRef.getSnapshot().context),
      { grokCollection }
    );
    reset(formState);
  };

  const selectorOptions = React.useMemo(() => getProcessorTypeSelectorOptions(isWired), [isWired]);

  return (
    <EuiFormRow
      fullWidth
      label={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.typeSelectorLabel',
        { defaultMessage: 'Processor' }
      )}
      helpText={getProcessorDescription(core.docLinks, isWired)(processorType)}
    >
      <EuiSuperSelect
        data-test-subj="streamsAppProcessorTypeSelector"
        disabled={disabled}
        options={selectorOptions}
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

const getAvailableProcessors: (isWired: boolean) => Partial<TAvailableProcessors> = (isWired) => ({
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
    getDocUrl: (docLinks: DocLinksStart) => (
      <FormattedMessage
        id="xpack.streams.streamDetailView.managementTab.enrichment.processor.dissectHelpText"
        defaultMessage="Uses {dissectLink} patterns to extract matches from a field."
        values={{
          dissectLink: (
            <EuiLink
              data-test-subj="streamsAppAvailableProcessorsDissectLink"
              external
              target="_blank"
              href={docLinks.links.ingest.dissect}
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
    getDocUrl: (docLinks: DocLinksStart) => (
      <FormattedMessage
        id="xpack.streams.streamDetailView.managementTab.enrichment.processor.grokHelpText"
        defaultMessage="Uses {grokLink} expressions to extract matches from a field."
        values={{
          grokLink: (
            <EuiLink
              data-test-subj="streamsAppAvailableProcessorsGrokLink"
              external
              target="_blank"
              href={docLinks.links.ingest.grok}
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
  convert: {
    type: 'convert' as const,
    inputDisplay: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.processor.convertInputDisplay',
      {
        defaultMessage: 'Convert',
      }
    ),
    getDocUrl: (docLinks: DocLinksStart) => {
      return (
        <FormattedMessage
          id="xpack.streams.streamDetailView.managementTab.enrichment.processor.setHelpText"
          defaultMessage="{convertLink}. For example, you can convert a string to an long."
          values={{
            convertLink: (
              <EuiLink
                data-test-subj="streamsAppAvailableProcessorsConvertLink"
                external
                target="_blank"
                href={docLinks.links.ingest.convert}
              >
                {i18n.translate('xpack.streams.availableProcessors.setLinkLabel', {
                  defaultMessage: 'Converts a field to a different data type',
                })}
              </EuiLink>
            ),
          }}
        />
      );
    },
  },
  set: {
    type: 'set' as const,
    inputDisplay: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.processor.setInputDisplay',
      {
        defaultMessage: 'Set',
      }
    ),
    getDocUrl: (docLinks: DocLinksStart) => {
      return (
        <FormattedMessage
          id="xpack.streams.streamDetailView.managementTab.enrichment.processor.setHelpText"
          defaultMessage="{setLink} If the field already exists, its value will be replaced with the provided one."
          values={{
            setLink: (
              <EuiLink
                data-test-subj="streamsAppAvailableProcessorsSetLink"
                external
                target="_blank"
                href={docLinks.links.ingest.set}
              >
                {i18n.translate('xpack.streams.availableProcessors.setLinkLabel', {
                  defaultMessage: 'Sets one field and associates it with the specified value.',
                })}
              </EuiLink>
            ),
          }}
        />
      );
    },
  },
  ...configDrivenProcessors,
  ...(isWired
    ? {}
    : {
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
      }),
});

const getProcessorDescription =
  (docLinks: DocLinksStart, isWired: boolean) => (type: ProcessorType) => {
    return getAvailableProcessors(isWired)[type]?.getDocUrl(docLinks);
  };

const getProcessorTypeSelectorOptions = (isWired: boolean) =>
  Object.values(getAvailableProcessors(isWired)).map(({ type, inputDisplay }) => ({
    value: type,
    inputDisplay,
  }));
