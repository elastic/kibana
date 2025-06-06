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
import { RenameProcessorConfig, RenameProcessorDefinition } from '@kbn/streams-schema';
import { ALWAYS_CONDITION } from '../../../../../../util/condition';
import { ConfigDrivenProcessorConfiguration, FieldConfiguration, FieldOptions } from '../types';
import { getConvertFormStateToConfig, getConvertProcessorToFormState } from '../utils';

export type RenameProcessorFormState = RenameProcessorConfig & { type: 'rename' };

const defaultFormState: RenameProcessorFormState = {
  type: 'rename' as const,
  field: '',
  target_field: '',
  ignore_missing: false,
  override: false,
  if: ALWAYS_CONDITION,
  ignore_failure: false,
};

const fieldOptions: FieldOptions = {
  fieldHelpText: i18n.translate(
    'xpack.streams.streamDetailView.managementTab.enrichment.processor.renameFieldHelpText',
    { defaultMessage: 'The field to be renamed.' }
  ),
  includeCondition: true,
  includeIgnoreFailures: true,
  includeIgnoreMissing: true,
};

const fieldConfigurations: FieldConfiguration[] = [
  {
    field: 'target_field',
    type: 'string',
    required: true,
    label: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.processor.renameTargetFieldLabel',
      { defaultMessage: 'Target field' }
    ),
    helpText: (
      <FormattedMessage
        id="xpack.streams.streamDetailView.managementTab.enrichment.processor.renameTargetFieldHelpText"
        defaultMessage="The new name of the field."
      />
    ),
  },
  {
    field: 'override',
    type: 'boolean',
    required: false,
    label: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.processor.renameOverrideLabel',
      { defaultMessage: 'Override' }
    ),
    helpText: (
      <FormattedMessage
        id="xpack.streams.streamDetailView.managementTab.enrichment.processor.renameOverrideHelpText"
        defaultMessage="If true, the processor will update pre-existing non-null-valued fields. When set to false, such fields will not be touched."
      />
    ),
  },
];

export const renameProcessorConfig: ConfigDrivenProcessorConfiguration<
  RenameProcessorFormState,
  RenameProcessorDefinition
> = {
  type: 'rename' as const,
  inputDisplay: i18n.translate(
    'xpack.streams.streamDetailView.managementTab.enrichment.processor.renameInputDisplay',
    {
      defaultMessage: 'Rename',
    }
  ),
  getDocUrl: (esDocUrl: string) => {
    return (
      <FormattedMessage
        id="xpack.streams.streamDetailView.managementTab.enrichment.processor.renameHelpText"
        defaultMessage="{renameLink} If the field doesn’t exist or the new name is already used, an exception will be thrown."
        values={{
          renameLink: (
            <EuiLink
              data-test-subj="streamsAppAvailableProcessorsRenameLink"
              external
              target="_blank"
              href={esDocUrl + 'rename-processor.html'}
            >
              {i18n.translate('xpack.streams.availableProcessors.renameLinkLabel', {
                defaultMessage: 'Renames an existing field.',
              })}
            </EuiLink>
          ),
        }}
      />
    );
  },
  defaultFormState,
  convertFormStateToConfig: getConvertFormStateToConfig<
    RenameProcessorFormState,
    RenameProcessorDefinition
  >('rename', fieldConfigurations, fieldOptions),
  convertProcessorToFormState: getConvertProcessorToFormState<
    RenameProcessorDefinition,
    RenameProcessorFormState
  >('rename', defaultFormState),
  fieldConfigurations,
  fieldOptions,
};
