/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiSpacer, EuiFieldText, EuiFormRow, EuiCode } from '@elastic/eui';
import { useController } from 'react-hook-form';
import { ProcessorFieldSelector } from '../processor_field_selector';
import { FieldsAccordion } from '../optional_fields_accordion';
import { IgnoreFailureToggle, IgnoreMissingToggle } from '../ignore_toggles';
import { ProcessorConditionEditor } from '../processor_condition_editor';
import { SplitTargetFieldSelector } from './target_field';
import type { SplitFormState } from '../../../../types';

export const SplitProcessorForm = () => {
  const { field: separatorField, fieldState: separatorFieldState } = useController<
    SplitFormState,
    'separator'
  >({
    name: 'separator',
    rules: {
      required: i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.splitSeparatorRequiredError',
        { defaultMessage: 'Separator is required.' }
      ),
    },
  });

  const { ref: separatorRef, ...separatorInputProps } = separatorField;

  return (
    <>
      <ProcessorFieldSelector
        fieldKey="from"
        helpText={i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processor.splitFieldHelpText',
          { defaultMessage: 'The field to split into an array.' }
        )}
      />
      <EuiFormRow
        label={i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processor.splitSeparatorLabel',
          { defaultMessage: 'Separator' }
        )}
        helpText={
          <FormattedMessage
            id="xpack.streams.streamDetailView.managementTab.enrichment.processor.splitSeparatorHelpText"
            defaultMessage="A regex which matches the separator. For example, use {commaExample} for commas, {whitespaceExample} for whitespace, or {dotExample} for a literal dot."
            values={{
              commaExample: <EuiCode>,</EuiCode>,
              whitespaceExample: <EuiCode>\s+</EuiCode>,
              dotExample: <EuiCode>\.</EuiCode>,
            }}
          />
        }
        isInvalid={separatorFieldState.invalid}
        error={separatorFieldState.error?.message}
        fullWidth
      >
        <EuiFieldText
          isInvalid={separatorFieldState.invalid}
          {...separatorInputProps}
          inputRef={separatorRef}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <SplitTargetFieldSelector />
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
