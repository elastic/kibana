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
import type { ReplaceProcessor } from '@kbn/streamlang';
import { ProcessorFieldSelector } from '../processor_field_selector';
import { FieldsAccordion } from '../optional_fields_accordion';
import { IgnoreFailureToggle, IgnoreMissingToggle } from '../ignore_toggles';
import { ProcessorConditionEditor } from '../processor_condition_editor';
import { ReplaceTargetFieldSelector } from './target_field';

export type ReplaceFormState = ReplaceProcessor;

export const ReplaceProcessorForm = () => {
  const { field: patternField, fieldState: patternFieldState } = useController<
    ReplaceFormState,
    'pattern'
  >({
    name: 'pattern',
    rules: {
      required: i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.replacePatternRequiredError',
        { defaultMessage: 'Pattern is required.' }
      ),
    },
  });

  const { field: replacementField, fieldState: replacementFieldState } = useController<
    ReplaceFormState,
    'replacement'
  >({
    name: 'replacement',
    // No validation - empty string is valid (removes the pattern)
  });

  return (
    <>
      <ProcessorFieldSelector
        fieldKey="from"
        helpText={i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processor.replaceFieldHelpText',
          { defaultMessage: 'The field to apply the replacement to.' }
        )}
      />
      <EuiFormRow
        label={i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processor.replacePatternLabel',
          { defaultMessage: 'Pattern' }
        )}
        helpText={
          <FormattedMessage
            id="xpack.streams.streamDetailView.managementTab.enrichment.processor.replacePatternHelpText"
            defaultMessage="Text or regex pattern that identifies what to replace with the replacement string. For example, use {regexExample} to replace a space."
            values={{
              regexExample: <EuiCode>\s</EuiCode>,
            }}
          />
        }
        isInvalid={patternFieldState.invalid}
        error={patternFieldState.error?.message}
        fullWidth
      >
        <EuiFieldText isInvalid={patternFieldState.invalid} {...patternField} />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processor.replaceReplacementLabel',
          { defaultMessage: 'Replacement' }
        )}
        helpText={
          <FormattedMessage
            id="xpack.streams.streamDetailView.managementTab.enrichment.processor.replaceReplacementHelpText"
            defaultMessage="Value that replaces any matches of the pattern. It can be text, an empty value, or a capture group reference (for example, {captureGroupExample})."
            values={{
              captureGroupExample: (
                <>
                  <EuiCode>$1</EuiCode>, <EuiCode>$2</EuiCode>
                </>
              ),
            }}
          />
        }
        isInvalid={replacementFieldState.invalid}
        error={replacementFieldState.error?.message}
        fullWidth
      >
        <EuiFieldText isInvalid={replacementFieldState.invalid} {...replacementField} />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <ReplaceTargetFieldSelector />
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
