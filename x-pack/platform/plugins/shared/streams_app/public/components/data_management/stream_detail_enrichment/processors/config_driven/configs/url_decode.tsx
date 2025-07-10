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
import { UrlDecodeProcessorConfig, UrlDecodeProcessorDefinition } from '@kbn/streams-schema';
import { ALWAYS_CONDITION } from '../../../../../../util/condition';
import { ConfigDrivenProcessorConfiguration, FieldConfiguration, FieldOptions } from '../types';
import { getConvertFormStateToConfig, getConvertProcessorToFormState } from '../utils';

export type UrlDecodeProcessorFormState = UrlDecodeProcessorConfig & { type: 'urldecode' };

const defaultFormState: UrlDecodeProcessorFormState = {
  type: 'urldecode' as const,
  field: '',
  target_field: '',
  ignore_missing: false,
  ignore_failure: false,
  if: ALWAYS_CONDITION,
};

const fieldOptions: FieldOptions = {
  fieldHelpText: i18n.translate(
    'xpack.streams.streamDetailView.managementTab.enrichment.processor.urlDecodeFieldHelpText',
    { defaultMessage: 'The field to decode.' }
  ),
  includeCondition: true,
  includeIgnoreFailures: true,
  includeIgnoreMissing: true,
};

const fieldConfigurations: FieldConfiguration[] = [
  {
    field: 'target_field',
    type: 'string',
    required: false,
    label: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.processor.urlDecodeTargetFieldLabel',
      { defaultMessage: 'Target field' }
    ),
    helpText: (
      <FormattedMessage
        id="xpack.streams.streamDetailView.managementTab.enrichment.processor.urlDecodeTargetFieldHelpText"
        defaultMessage="The field to assign the converted value to, by default {field} is updated in-place."
        values={{
          field: <EuiCode>field</EuiCode>,
        }}
      />
    ),
  },
];

export const urlDecodeProcessorConfig: ConfigDrivenProcessorConfiguration<
  UrlDecodeProcessorFormState,
  UrlDecodeProcessorDefinition
> = {
  type: 'urldecode' as const,
  inputDisplay: i18n.translate(
    'xpack.streams.streamDetailView.managementTab.enrichment.processor.urlDecodeInputDisplay',
    {
      defaultMessage: 'URL Decode',
    }
  ),
  getDocUrl: (esDocUrl: string) => {
    return (
      <FormattedMessage
        id="xpack.streams.streamDetailView.managementTab.enrichment.processor.urlDecodeHelpText"
        defaultMessage="{urlDecodeLink} If the field is an array of strings, all members of the array will be decoded."
        values={{
          urlDecodeLink: (
            <EuiLink
              data-test-subj="streamsAppAvailableProcessorsUrlDecodeLink"
              external
              target="_blank"
              href={esDocUrl + 'urldecode-processor.html'}
            >
              {i18n.translate('xpack.streams.availableProcessors.urlDecodeLinkLabel', {
                defaultMessage: 'URL-decodes a string.',
              })}
            </EuiLink>
          ),
        }}
      />
    );
  },
  defaultFormState,
  convertFormStateToConfig: getConvertFormStateToConfig<
    UrlDecodeProcessorFormState,
    UrlDecodeProcessorDefinition
  >('urldecode', fieldConfigurations, fieldOptions),
  convertProcessorToFormState: getConvertProcessorToFormState<
    UrlDecodeProcessorDefinition,
    UrlDecodeProcessorFormState
  >('urldecode', defaultFormState),
  fieldConfigurations,
  fieldOptions,
};
