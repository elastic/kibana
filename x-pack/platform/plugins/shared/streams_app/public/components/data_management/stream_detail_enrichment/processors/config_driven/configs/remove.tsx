/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  RemoveProcessorConfig,
  RemoveProcessorDefinition,
} from '@kbn/streams-schema/src/models/ingest/processors';
import React from 'react';
import { ALWAYS_CONDITION } from '../../../../../../util/condition';
import { ConfigDrivenProcessorConfiguration, FieldConfiguration, FieldOptions } from '../types';
import { getConvertFormStateToConfig, getConvertProcessorToFormState } from '../utils';

export type RemoveProcessorFormState = RemoveProcessorConfig & { type: 'remove' };

const defaultFormState: RemoveProcessorFormState = {
  type: 'remove' as const,
  field: '',
  ignore_failure: false,
  if: ALWAYS_CONDITION,
};

const fieldOptions: FieldOptions = {
  fieldHelpText: i18n.translate(
    'xpack.streams.streamDetailView.managementTab.enrichment.processor.removeFieldHelpText',
    { defaultMessage: 'Remove' }
  ),
  includeCondition: true,
  includeIgnoreMissing: false,
  includeIgnoreFailures: true,
};

const fieldConfigurations: FieldConfiguration[] = [];

export const removeProcessorConfig: ConfigDrivenProcessorConfiguration<
  RemoveProcessorFormState,
  RemoveProcessorDefinition
> = {
  type: 'remove' as const,
  inputDisplay: i18n.translate(
    'xpack.streams.streamDetailView.managementTab.enrichment.processor.removeInputDisplay',
    {
      defaultMessage: 'Remove',
    }
  ),
  getDocUrl: (esDocUrl: string) => {
    return <></>;
  },
  defaultFormState,
  convertFormStateToConfig: getConvertFormStateToConfig<
    RemoveProcessorFormState,
    RemoveProcessorDefinition
  >('remove', fieldConfigurations, fieldOptions),
  convertProcessorToFormState: getConvertProcessorToFormState<
    RemoveProcessorDefinition,
    RemoveProcessorFormState
  >('remove', defaultFormState),
  fieldConfigurations,
  fieldOptions,
};
