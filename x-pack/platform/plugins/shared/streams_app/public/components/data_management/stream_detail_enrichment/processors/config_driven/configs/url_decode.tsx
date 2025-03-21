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
import { isEmpty } from 'lodash';
import { ALWAYS_CONDITION } from '../../../../../../util/condition';
import { ConfigDrivenProcessorConfiguration } from '../types';

export type UrlDecodeProcessorFormState = UrlDecodeProcessorConfig & { type: 'urldecode' };

export const urlDecodeProcessorConfig: ConfigDrivenProcessorConfiguration<
  UrlDecodeProcessorFormState,
  UrlDecodeProcessorDefinition
> = {
  value: 'urldecode' as const,
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
  defaultFormState: {
    type: 'urldecode' as const,
    field: '',
    target_field: '',
    ignore_missing: false,
    ignore_failure: false,
    if: ALWAYS_CONDITION,
  },
  convertFormStateToConfig: (formState) => {
    return {
      urldecode: {
        if: formState.if,
        field: formState.field,
        target_field: isEmpty(formState.target_field) ? undefined : formState.target_field,
        ignore_missing: formState.ignore_missing,
        ignore_failure: formState.ignore_failure,
      },
    };
  },
  convertProcessorToFormState: (processor) => {
    const { urldecode } = processor;

    return structuredClone({
      ...urldecode,
      type: 'urldecode',
    });
  },
  fieldConfigurations: [
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
  ],
  fieldOptions: {
    fieldHelpText: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.processor.urlDecodeFieldHelpText',
      { defaultMessage: 'The field to decode.' }
    ),
    includeCondition: true,
    includeIgnoreFailures: true,
    includeIgnoreMissing: true,
  },
};
