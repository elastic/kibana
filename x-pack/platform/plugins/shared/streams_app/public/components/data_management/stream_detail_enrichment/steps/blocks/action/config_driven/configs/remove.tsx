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
import { ALWAYS_CONDITION, type RemoveProcessor } from '@kbn/streamlang';
import type {
  ConfigDrivenProcessorConfiguration,
  FieldConfiguration,
  FieldOptions,
} from '../types';
import { getConvertFormStateToConfig, getConvertProcessorToFormState } from '../utils';

export type RemoveProcessorFormState = RemoveProcessor;

const defaultFormState: RemoveProcessorFormState = {
  action: 'remove' as const,
  from: '',
  ignore_missing: true,
  where: ALWAYS_CONDITION,
  ignore_failure: true,
};

const fieldOptions: FieldOptions = {
  fieldKey: 'from',
  fieldHelpText: i18n.translate(
    'xpack.streams.streamDetailView.managementTab.enrichment.processor.removeFieldHelpText',
    {
      defaultMessage: 'The field to be removed.',
    }
  ),
  includeCondition: true,
  includeIgnoreFailures: true,
  includeIgnoreMissing: true,
};

const fieldConfigurations: FieldConfiguration[] = [];

export const removeProcessorConfig: ConfigDrivenProcessorConfiguration<
  RemoveProcessorFormState,
  RemoveProcessor
> = {
  type: 'remove' as const,
  inputDisplay: i18n.translate(
    'xpack.streams.streamDetailView.managementTab.enrichment.processor.removeInputDisplay',
    {
      defaultMessage: 'Remove',
    }
  ),
  getDocUrl: (docLinks: DocLinksStart) => {
    return (
      <FormattedMessage
        id="xpack.streams.streamDetailView.managementTab.enrichment.processor.removeHelpText"
        defaultMessage="{removeLink} The processor removes the specified field."
        values={{
          removeLink: (
            <EuiLink
              data-test-subj="streamsAppAvailableProcessorsRemoveLink"
              external
              target="_blank"
              href={docLinks.links.ingest.remove}
            >
              {i18n.translate('xpack.streams.availableProcessors.removeLinkLabel', {
                defaultMessage: 'Removes a field.',
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
  convertFormStateToConfig: getConvertFormStateToConfig<RemoveProcessorFormState, RemoveProcessor>(
    fieldConfigurations,
    fieldOptions
  ),
  convertProcessorToFormState: getConvertProcessorToFormState<
    RemoveProcessor,
    RemoveProcessorFormState
  >(defaultFormState),
};
