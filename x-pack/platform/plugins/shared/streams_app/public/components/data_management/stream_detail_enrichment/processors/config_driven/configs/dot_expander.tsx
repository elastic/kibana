/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  DotExpanderProcessorConfig,
  DotExpanderProcessorDefinition,
} from '@kbn/streams-schema/src/models/ingest/processors';
import { ALWAYS_CONDITION } from '../../../../../../util/condition';
import { ConfigDrivenProcessorConfiguration, FieldConfiguration, FieldOptions } from '../types';
import { getConvertFormStateToConfig, getConvertProcessorToFormState } from '../utils';

export type DotExpanderProcessorFormState = DotExpanderProcessorConfig & { type: 'dot_expander' };

const defaultFormState: DotExpanderProcessorFormState = {
  type: 'dot_expander' as const,
  field: '*',
  if: ALWAYS_CONDITION,
};

const fieldOptions: FieldOptions = {
  fieldHelpText: i18n.translate(
    'xpack.streams.streamDetailView.managementTab.enrichment.processor.dotExpanderFieldHelpText',
    { defaultMessage: 'Dot expander (internal).' }
  ),
  includeCondition: true,
  includeIgnoreFailures: true,
  includeIgnoreMissing: true,
};

const fieldConfigurations: FieldConfiguration[] = [];

export const dotExpanderProcessorConfig: ConfigDrivenProcessorConfiguration<
  DotExpanderProcessorFormState,
  DotExpanderProcessorDefinition
> = {
  type: 'dot_expander' as const,
  inputDisplay: i18n.translate(
    'xpack.streams.streamDetailView.managementTab.enrichment.processor.dotExpanderInputDisplay',
    {
      defaultMessage: 'Dot Expander',
    }
  ),
  getDocUrl: (esDocUrl: string) => {
    return <></>;
  },
  defaultFormState,
  convertFormStateToConfig: getConvertFormStateToConfig<
    DotExpanderProcessorFormState,
    DotExpanderProcessorDefinition
  >('dot_expander', fieldConfigurations, fieldOptions),
  convertProcessorToFormState: getConvertProcessorToFormState<
    DotExpanderProcessorDefinition,
    DotExpanderProcessorFormState
  >('dot_expander', defaultFormState),
  fieldConfigurations,
  fieldOptions,
};
