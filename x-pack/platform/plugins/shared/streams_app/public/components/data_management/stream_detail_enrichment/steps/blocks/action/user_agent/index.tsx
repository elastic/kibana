/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer, EuiFieldText, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useFormContext } from 'react-hook-form';
import { ProcessorFieldSelector } from '../processor_field_selector';
import { FieldsAccordion } from '../optional_fields_accordion';
import { ProcessorConditionEditor } from '../processor_condition_editor';
import { IgnoreFailureToggle, IgnoreMissingToggle } from '../ignore_toggles';
import type { UserAgentFormState } from '../../../../types';

const TargetFieldSelector = () => {
  const { register } = useFormContext<UserAgentFormState>();
  const { ref, ...inputProps } = register('to');

  return (
    <EuiFormRow
      label={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.userAgentTargetLabel',
        { defaultMessage: 'Target field' }
      )}
      helpText={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.userAgentTargetHelpText',
        {
          defaultMessage:
            'The field that will contain the extracted user agent information. Defaults to "user_agent".',
        }
      )}
      fullWidth
    >
      <EuiFieldText {...inputProps} inputRef={ref} placeholder="user_agent" />
    </EuiFormRow>
  );
};

export const UserAgentProcessorForm = () => {
  return (
    <>
      <ProcessorFieldSelector
        fieldKey="from"
        helpText={i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processor.userAgentFieldHelpText',
          { defaultMessage: 'The field containing the user agent string.' }
        )}
      />
      <EuiSpacer size="m" />
      <TargetFieldSelector />
      <EuiSpacer size="m" />
      <FieldsAccordion>
        <ProcessorConditionEditor />
      </FieldsAccordion>
      <EuiSpacer size="m" />
      <IgnoreFailureToggle />
      <IgnoreMissingToggle />
    </>
  );
};
