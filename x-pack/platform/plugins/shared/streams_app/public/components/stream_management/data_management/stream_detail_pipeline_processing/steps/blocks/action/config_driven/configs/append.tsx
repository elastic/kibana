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
import type { NativeProcessorFormState } from '../../../../../types';
import type {
  ConfigDrivenProcessorConfiguration,
  FieldConfiguration,
  FieldOptions,
} from '../types';
import { getConvertFormStateToConfig, getConvertProcessorToFormState } from '../utils';

export type AppendProcessorFormState = NativeProcessorFormState<'append'>;

const defaultFormState: AppendProcessorFormState = {
  action: 'append',
  field: '',
  value: [],
  allow_duplicates: false,
  ignore_failure: false,
};

const fieldOptions: FieldOptions = {
  fieldKey: 'field',
  includeCondition: false,
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
  AppendProcessorFormState
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
        defaultMessage="{appendLink}. If the field is missing or a scalar, it's created or converted to an array first."
        values={{
          appendLink: (
            <EuiLink
              data-test-subj="streamsAppAvailableProcessorsAppendLink"
              external
              target="_blank"
              href={docLinks.links.ingest.append}
            >
              {i18n.translate('xpack.streams.availableProcessors.appendLinkLabel', {
                defaultMessage: 'Append one or more values to an existing array',
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
  convertFormStateToConfig: getConvertFormStateToConfig<
    AppendProcessorFormState,
    AppendProcessorFormState
  >(fieldConfigurations, fieldOptions),
  convertProcessorToFormState: getConvertProcessorToFormState<
    AppendProcessorFormState,
    AppendProcessorFormState
  >(defaultFormState),
};
