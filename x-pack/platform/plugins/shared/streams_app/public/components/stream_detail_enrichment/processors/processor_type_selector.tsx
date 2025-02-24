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
import { useKibana } from '../../../hooks/use_kibana';
import { getDefaultFormState } from '../utils';
import { ProcessorFormState } from '../types';

interface TAvailableProcessor {
  value: ProcessorType;
  inputDisplay: string;
  getDocUrl: (esDocUrl: string) => React.ReactNode;
}

type TAvailableProcessors = Record<ProcessorType, TAvailableProcessor>;

export const ProcessorTypeSelector = ({
  disabled = false,
}: Pick<EuiSuperSelectProps, 'disabled'>) => {
  const { core } = useKibana();
  const esDocUrl = core.docLinks.links.elasticsearch.docsBase;

  const { reset } = useFormContext();
  const { field, fieldState } = useController<ProcessorFormState, 'type'>({
    name: 'type',
    rules: { required: true },
  });

  const processorType = useWatch<{ type: ProcessorType }>({ name: 'type' });

  const handleChange = (type: ProcessorType) => {
    const formState = getDefaultFormState(type);
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
  dissect: {
    value: 'dissect',
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
    value: 'grok',
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
};

const getProcessorDescription = (esDocUrl: string) => (type: ProcessorType) =>
  availableProcessors[type].getDocUrl(esDocUrl);

const processorTypeSelectorOptions = Object.values(availableProcessors).map(
  ({ value, inputDisplay }) => ({ value, inputDisplay })
);
