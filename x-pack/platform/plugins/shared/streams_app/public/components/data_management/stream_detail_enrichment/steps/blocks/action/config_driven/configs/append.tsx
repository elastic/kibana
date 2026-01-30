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
import type { DocLinksStart } from '@kbn/core/public';
import type { AppendProcessor } from '@kbn/streamlang';
import { ALWAYS_CONDITION } from '@kbn/streamlang';
import type {
  ConfigDrivenProcessorConfiguration,
  FieldConfiguration,
  FieldOptions,
} from '../types';
import { getConvertFormStateToConfig, getConvertProcessorToFormState } from '../utils';

export type AppendProcessorFormState = AppendProcessor;

const defaultFormState: AppendProcessorFormState = {
  action: 'append',
  to: '',
  value: [],
  allow_duplicates: false,
  where: ALWAYS_CONDITION,
  ignore_failure: false,
};

const fieldOptions: FieldOptions = {
  fieldKey: 'to',
  fieldHelpText: i18n.translate(
    'xpack.streams.streamDetailView.managementTab.enrichment.processor.appendFieldHelpText',
    { defaultMessage: 'The field to append values to.' }
  ),
  includeCondition: true,
  includeIgnoreFailures: true,
  includeIgnoreMissing: false,
};

const fieldConfigurations: FieldConfiguration[] = [
  {
    field: 'value',
    type: 'array',
    required: true,
    label: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.processor.appendValueLabel',
      { defaultMessage: 'Values to append' }
    ),
    helpText: (
      <FormattedMessage
        id="xpack.streams.streamDetailView.managementTab.enrichment.processor.appendValueHelpText"
        defaultMessage="The values to append to the field."
      />
    ),
  },
  {
    field: 'allow_duplicates',
    type: 'boolean',
    required: false,
    label: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.processor.appendAllowDuplicatesLabel',
      { defaultMessage: 'Allow duplicates' }
    ),
    helpText: (
      <FormattedMessage
        id="xpack.streams.streamDetailView.managementTab.enrichment.processor.appendAllowDuplicatesHelpText"
        defaultMessage="If false, the processor does not append values already present in the field."
      />
    ),
  },
];

export const appendProcessorConfig: ConfigDrivenProcessorConfiguration<
  AppendProcessorFormState,
  AppendProcessor
> = {
  type: 'append' as const,
  inputDisplay: i18n.translate(
    'xpack.streams.streamDetailView.managementTab.enrichment.processor.appendInputDisplay',
    {
      defaultMessage: 'Append',
    }
  ),
  getDocUrl: (docLinks: DocLinksStart) => {
    return (
      <FormattedMessage
        id="xpack.streams.streamDetailView.managementTab.enrichment.processor.appendHelpText"
        defaultMessage="{appendLink} Appends one or more values to an existing array if the field already exists and it is an array. Converts a scalar to an array and appends one or more values to it if the field exists and it is a scalar. Creates an array containing the provided values if the field doesn't exist."
        values={{
          appendLink: (
            <EuiLink
              data-test-subj="streamsAppAvailableProcessorsAppendLink"
              external
              target="_blank"
              href={docLinks.links.ingest.append}
            >
              {i18n.translate('xpack.streams.availableProcessors.appendLinkLabel', {
                defaultMessage: 'Appends values.',
              })}
            </EuiLink>
          ),
        }}
      />
    );
  },
  defaultFormState,
  fieldConfigurations,
  fieldOptions,
  convertFormStateToConfig: getConvertFormStateToConfig<AppendProcessorFormState, AppendProcessor>(
    fieldConfigurations,
    fieldOptions
  ),
  convertProcessorToFormState: getConvertProcessorToFormState<
    AppendProcessor,
    AppendProcessorFormState
  >(defaultFormState),
};
