/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCode, EuiLink } from '@elastic/eui';
import { SetProcessorConfig, SetProcessorDefinition } from '@kbn/streams-schema';
import { isEmpty } from 'lodash';
import { ALWAYS_CONDITION } from '../../../../../../util/condition';
import { ConfigDrivenProcessorConfiguration } from '../types';

export type SetProcessorFormState = SetProcessorConfig & { type: 'set' };

export const setProcessorConfig: ConfigDrivenProcessorConfiguration<
  SetProcessorFormState,
  SetProcessorDefinition
> = {
  value: 'set' as const,
  inputDisplay: i18n.translate(
    'xpack.streams.streamDetailView.managementTab.enrichment.processor.setInputDisplay',
    {
      defaultMessage: 'Set',
    }
  ),
  getDocUrl: (esDocUrl: string) => {
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
              href={esDocUrl + 'set-processor.html'}
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
  defaultFormState: {
    type: 'set' as const,
    field: '',
    value: '',
    ignore_failure: false,
    override: true,
    ignore_empty_value: false,
    media_type: '',
    if: ALWAYS_CONDITION,
  },
  convertFormStateToConfig: (formState) => {
    return {
      set: {
        if: formState.if,
        field: formState.field,
        value: formState.value,
        override: formState.override,
        ignore_empty_value: formState.ignore_empty_value,
        media_type: isEmpty(formState.media_type) ? undefined : formState.media_type,
        ignore_failure: formState.ignore_failure,
      },
    };
  },
  convertProcessorToFormState: (processor) => {
    const { set } = processor;

    return structuredClone({
      ...set,
      type: 'set',
    });
  },
  fieldConfigurations: [
    {
      field: 'value',
      type: 'string',
      required: true,
      label: i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.setValueFieldLabel',
        { defaultMessage: 'Value' }
      ),
      helpText: (
        <FormattedMessage
          id="xpack.streams.streamDetailView.managementTab.enrichment.processor.setValueFieldHelpText"
          defaultMessage="The value to be set for the field. Supports template snippets."
        />
      ),
    },
    {
      field: 'override',
      type: 'boolean',
      required: false,
      label: i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.setOverrideLabel',
        { defaultMessage: 'Override' }
      ),
      helpText: (
        <FormattedMessage
          id="xpack.streams.streamDetailView.managementTab.enrichment.processor.setOverrideHelpText"
          defaultMessage="If true processor will update fields with pre-existing non-null-valued field. When set to false, such fields will not be touched."
        />
      ),
    },
    {
      field: 'ignore_empty_value',
      type: 'boolean',
      required: false,
      label: i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.setIgnoreEmptyValueLabel',
        { defaultMessage: 'Ignore empty value' }
      ),
      helpText: (
        <FormattedMessage
          id="xpack.streams.streamDetailView.managementTab.enrichment.processor.setIgnoreEmptyValueHelpText"
          defaultMessage="If true and used in combination with {value} which is a template snippet that evaluates to null or an empty string, the processor quietly exits without modifying the document."
          values={{ value: <EuiCode>value</EuiCode> }}
        />
      ),
    },
    {
      field: 'media_type',
      type: 'string',
      required: false,
      label: i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.setMediaTypeLabel',
        { defaultMessage: 'Media type' }
      ),
      helpText: (
        <FormattedMessage
          id="xpack.streams.streamDetailView.managementTab.enrichment.processor.setMediaTypeHelpText"
          defaultMessage="The media type for encoding value. Applies only when {value} is a template snippet. Must be one of application/json, text/plain, or application/x-www-form-urlencoded."
          values={{ value: <EuiCode>value</EuiCode> }}
        />
      ),
    },
  ],
  fieldOptions: {
    fieldHelpText: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.processor.setFieldHelpText',
      { defaultMessage: 'The field to insert, upsert, or update.' }
    ),
    includeCondition: true,
    includeIgnoreFailures: true,
    includeIgnoreMissing: false,
  },
};
