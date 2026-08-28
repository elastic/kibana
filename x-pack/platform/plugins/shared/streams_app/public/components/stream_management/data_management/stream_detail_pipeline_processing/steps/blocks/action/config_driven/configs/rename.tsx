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

export type RenameProcessorFormState = NativeProcessorFormState<'rename'>;

const defaultFormState: RenameProcessorFormState = {
  action: 'rename' as const,
  field: '',
  target_field: '',
  ignore_missing: false,
  ignore_failure: false,
};

const fieldOptions: FieldOptions = {
  fieldKey: 'field',
  includeCondition: false,
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
      { defaultMessage: 'New field name' }
    ),
  },
];

export const renameProcessorConfig: ConfigDrivenProcessorConfiguration<
  RenameProcessorFormState,
  RenameProcessorFormState
> = {
  type: 'rename' as const,
  inputDisplay: i18n.translate(
    'xpack.streams.streamDetailView.managementTab.enrichment.processor.renameInputDisplay',
    {
      defaultMessage: 'Rename',
    }
  ),
  getDocUrl: (docLinks: DocLinksStart) => {
    return (
      <FormattedMessage
        id="xpack.streams.streamDetailView.managementTab.enrichment.processor.renameHelpText"
        defaultMessage="{renameLink}."
        values={{
          renameLink: (
            <EuiLink
              data-test-subj="streamsAppAvailableProcessorsRenameLink"
              external
              target="_blank"
              href={docLinks.links.ingest.rename}
            >
              {i18n.translate('xpack.streams.availableProcessors.renameLinkLabel', {
                defaultMessage: 'Rename an existing field',
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
    RenameProcessorFormState
  >(fieldConfigurations, fieldOptions),
  convertProcessorToFormState: getConvertProcessorToFormState<
    RenameProcessorFormState,
    RenameProcessorFormState
  >(defaultFormState),
  fieldConfigurations,
  fieldOptions,
};
