/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiLink } from '@elastic/eui';
import { EuiCode } from '@elastic/eui';
import { KvProcessorConfig, KvProcessorDefinition } from '@kbn/streams-schema';
import { ALWAYS_CONDITION } from '../../../../../../util/condition';
import { ConfigDrivenProcessorConfiguration, FieldConfiguration, FieldOptions } from '../types';
import { getConvertFormStateToConfig, getConvertProcessorToFormState } from '../utils';

export type KvProcessorFormState = KvProcessorConfig & { type: 'kv' };

const defaultFormState: KvProcessorFormState = {
  type: 'kv' as const,
  field: '',
  field_split: '',
  value_split: '',
  target_field: '',
  include_keys: [],
  exclude_keys: [],
  prefix: '',
  trim_key: '',
  trim_value: '',
  strip_brackets: false,
  ignore_failure: true,
  ignore_missing: true,
  if: ALWAYS_CONDITION,
};

const fieldOptions: FieldOptions = {
  fieldHelpText: i18n.translate(
    'xpack.streams.streamDetailView.managementTab.enrichment.processor.kvFieldHelpText',
    { defaultMessage: 'The field to be parsed.' }
  ),
  includeCondition: true,
  includeIgnoreFailures: true,
  includeIgnoreMissing: true,
};

const fieldConfigurations: FieldConfiguration[] = [
  {
    field: 'field_split',
    type: 'string',
    required: true,
    label: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.processor.kvFieldSplitLabel',
      { defaultMessage: 'Field split' }
    ),
    helpText: (
      <FormattedMessage
        id="xpack.streams.streamDetailView.managementTab.enrichment.processor.kvFieldSplitHelpText"
        defaultMessage="Regex pattern used to delimit the key-value pairs. Typically a space character ({character})."
        values={{ character: <EuiCode>&quot; &quot;</EuiCode> }}
      />
    ),
  },
  {
    field: 'value_split',
    type: 'string',
    required: true,
    label: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.processor.kvValueSplitLabel',
      { defaultMessage: 'Value split' }
    ),
    helpText: (
      <FormattedMessage
        id="xpack.streams.streamDetailView.managementTab.enrichment.processor.kvValueSplitHelpText"
        defaultMessage="Regex pattern used to delimit the key from the value. Typically an equals sign ({character})."
        values={{ character: <EuiCode>=</EuiCode> }}
      />
    ),
  },
  {
    field: 'target_field',
    type: 'string',
    required: false,
    label: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.processor.kvTargetFieldLabel',
      { defaultMessage: 'Target field' }
    ),
    helpText: (
      <FormattedMessage
        id="xpack.streams.streamDetailView.managementTab.enrichment.processor.kvTargetFieldHelpText"
        defaultMessage="The field to assign the parsed key-value pairs to. If not specified, the key-value pairs are assigned to the root of the document."
      />
    ),
  },
  {
    field: 'include_keys',
    type: 'array',
    required: false,
    label: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.processor.kvIncludeKeysLabel',
      { defaultMessage: 'Include keys' }
    ),
    helpText: (
      <FormattedMessage
        id="xpack.streams.streamDetailView.managementTab.enrichment.processor.kvIncludeKeysHelpText"
        defaultMessage="A list of extracted keys to include in the output. If not specified, all keys are included by default."
      />
    ),
  },
  {
    field: 'exclude_keys',
    type: 'array',
    required: false,
    label: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.processor.kvExcludeKeysLabel',
      { defaultMessage: 'Exclude keys' }
    ),
    helpText: (
      <FormattedMessage
        id="xpack.streams.streamDetailView.managementTab.enrichment.processor.kvExcludeKeysHelpText"
        defaultMessage="A list of extracted keys to exclude from the output."
      />
    ),
  },
  {
    field: 'prefix',
    type: 'string',
    required: false,
    label: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.processor.kvPrefixLabel',
      { defaultMessage: 'Prefix' }
    ),
    helpText: (
      <FormattedMessage
        id="xpack.streams.streamDetailView.managementTab.enrichment.processor.kvPrefixHelpText"
        defaultMessage="A prefix to add to extracted keys."
      />
    ),
  },
  {
    field: 'trim_key',
    type: 'string',
    required: false,
    label: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.processor.kvTrimKeyLabel',
      { defaultMessage: 'Trim key' }
    ),
    helpText: (
      <FormattedMessage
        id="xpack.streams.streamDetailView.managementTab.enrichment.processor.kvTrimKeyHelpText"
        defaultMessage="String of characters to trim from extracted keys."
      />
    ),
  },
  {
    field: 'trim_value',
    type: 'string',
    required: false,
    label: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.processor.kvTrimValueLabel',
      { defaultMessage: 'Trim value' }
    ),
    helpText: (
      <FormattedMessage
        id="xpack.streams.streamDetailView.managementTab.enrichment.processor.kvTrimValueHelpText"
        defaultMessage="String of characters to trim from extracted values."
      />
    ),
  },
  {
    field: 'strip_brackets',
    type: 'boolean',
    required: false,
    label: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.processor.kvStripBracketsLabel',
      { defaultMessage: 'Strip brackets' }
    ),
    helpText: (
      <FormattedMessage
        id="xpack.streams.streamDetailView.managementTab.enrichment.processor.kvStripBracketsHelpText"
        defaultMessage="Remove brackets ( {brackets}, {angularBrackets}, {squareBrackets}) and quotes ({singleQuote}, {doubleQuote}) from extracted values."
        values={{
          brackets: <EuiCode>()</EuiCode>,
          angularBrackets: <EuiCode>&lt;&gt;</EuiCode>,
          squareBrackets: <EuiCode>[]</EuiCode>,
          singleQuote: <EuiCode>&apos;</EuiCode>,
          doubleQuote: <EuiCode>&quot;</EuiCode>,
        }}
      />
    ),
  },
];

export const kvProcessorConfig: ConfigDrivenProcessorConfiguration<
  KvProcessorFormState,
  KvProcessorDefinition
> = {
  type: 'kv' as const,
  inputDisplay: i18n.translate(
    'xpack.streams.streamDetailView.managementTab.enrichment.processor.kvInputDisplay',
    {
      defaultMessage: 'Key-value (KV)',
    }
  ),
  getDocUrl: (esDocUrl: string) => {
    return (
      <FormattedMessage
        id="xpack.streams.streamDetailView.managementTab.enrichment.processor.kvHelpText"
        defaultMessage="Helps automatically parse messages (or specific event fields) which are of the {kvLink}"
        values={{
          kvLink: (
            <EuiLink
              data-test-subj="streamsAppAvailableProcessorsKvLink"
              external
              target="_blank"
              href={esDocUrl + 'kv-processor.html'}
            >
              {i18n.translate('xpack.streams.availableProcessors.kvLinkLabel', {
                defaultMessage: 'foo=bar variety.',
              })}
            </EuiLink>
          ),
        }}
      />
    );
  },
  defaultFormState,
  convertFormStateToConfig: getConvertFormStateToConfig<
    KvProcessorFormState,
    KvProcessorDefinition
  >('kv', fieldConfigurations, fieldOptions),
  convertProcessorToFormState: getConvertProcessorToFormState<
    KvProcessorDefinition,
    KvProcessorFormState
  >('kv', defaultFormState),
  fieldConfigurations,
  fieldOptions,
};
