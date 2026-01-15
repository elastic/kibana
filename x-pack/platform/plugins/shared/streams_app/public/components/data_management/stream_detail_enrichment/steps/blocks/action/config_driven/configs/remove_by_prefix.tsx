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
import type { RemoveByPrefixProcessor } from '@kbn/streamlang';
import type {
  ConfigDrivenProcessorConfiguration,
  FieldConfiguration,
  FieldOptions,
} from '../types';
import { getConvertFormStateToConfig, getConvertProcessorToFormState } from '../utils';

export type RemoveByPrefixProcessorFormState = RemoveByPrefixProcessor;

const defaultFormState: RemoveByPrefixProcessorFormState = {
  action: 'remove_by_prefix' as const,
  from: '',
  ignore_failure: true,
};

const fieldOptions: FieldOptions = {
  fieldKey: 'from',
  fieldHelpText: i18n.translate(
    'xpack.streams.streamDetailView.managementTab.enrichment.processor.removeByPrefixFieldHelpText',
    {
      defaultMessage: 'The field to be removed. All nested fields (field.*) will also be removed.',
    }
  ),
  includeCondition: false,
  includeIgnoreFailures: true,
  includeIgnoreMissing: false,
};

const fieldConfigurations: FieldConfiguration[] = [];

export const removeByPrefixProcessorConfig: ConfigDrivenProcessorConfiguration<
  RemoveByPrefixProcessorFormState,
  RemoveByPrefixProcessor
> = {
  type: 'remove_by_prefix' as const,
  inputDisplay: i18n.translate(
    'xpack.streams.streamDetailView.managementTab.enrichment.processor.removeByPrefixInputDisplay',
    {
      defaultMessage: 'Remove by prefix',
    }
  ),
  getDocUrl: (docLinks: DocLinksStart) => {
    return (
      <FormattedMessage
        id="xpack.streams.streamDetailView.managementTab.enrichment.processor.removeByPrefixHelpText"
        defaultMessage="{removeByPrefixLink} The processor removes the field and all its nested fields (field.*)."
        values={{
          removeByPrefixLink: (
            <EuiLink
              data-test-subj="streamsAppAvailableProcessorsRemoveByPrefixLink"
              external
              target="_blank"
              href={docLinks.links.ingest.remove}
            >
              {i18n.translate('xpack.streams.availableProcessors.removeByPrefixLinkLabel', {
                defaultMessage: 'Removes a field and all nested fields.',
              })}
            </EuiLink>
          ),
        }}
      />
    );
  },
  defaultFormState,
  convertFormStateToConfig: getConvertFormStateToConfig<
    RemoveByPrefixProcessorFormState,
    RemoveByPrefixProcessor
  >(fieldConfigurations, fieldOptions),
  convertProcessorToFormState: getConvertProcessorToFormState<
    RemoveByPrefixProcessor,
    RemoveByPrefixProcessorFormState
  >(defaultFormState),
  fieldConfigurations,
  fieldOptions,
};
