/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
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
      <EuiLink
        data-test-subj="streamsAppAvailableProcessorsRemoveLink"
        external
        target="_blank"
        href={docLinks.links.ingest.remove}
      >
        {i18n.translate('xpack.streams.availableProcessors.removeLinkLabel', {
          defaultMessage: 'Remove a specific field.',
        })}
      </EuiLink>
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
