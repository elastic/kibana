/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiSpacer,
  EuiFieldText,
  EuiFormRow,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiButtonEmpty,
  EuiComboBox,
  EuiText,
  type EuiComboBoxOptionOption,
} from '@elastic/eui';
import { useController, useFieldArray, useFormContext } from 'react-hook-form';
import { ProcessorFieldSelector } from '../processor_field_selector';
import { FieldsAccordion } from '../optional_fields_accordion';
import { IgnoreFailureToggle, IgnoreMissingToggle } from '../ignore_toggles';
import { ProcessorConditionEditor } from '../processor_condition_editor';
import { RedactPatternDefinition } from './redact_pattern_definition';
import type { RedactFormState } from '../../../../types';

// Common Grok patterns useful for redaction with human-readable labels
// These are official ES Grok patterns from @kbn/grok-ui
// NOTE: Only patterns with specific, well-defined formats are suitable for blind redaction.
// Broad patterns like USERNAME, HOSTNAME, WORD match too many things and should not be used.
const COMMON_REDACT_PATTERNS = [
  { pattern: 'IP', label: 'IP address', semanticName: 'ip_address' },
  { pattern: 'EMAILADDRESS', label: 'Email address', semanticName: 'email' },
  { pattern: 'MAC', label: 'MAC address', semanticName: 'mac_address' },
  { pattern: 'UUID', label: 'UUID', semanticName: 'uuid' },
  { pattern: 'URI', label: 'URI', semanticName: 'uri' },
];

export const RedactProcessorForm = () => {
  const { control } = useFormContext<RedactFormState>();
  const { fields, append, remove } = useFieldArray<RedactFormState, 'patterns'>({
    control,
    name: 'patterns',
    rules: {
      minLength: {
        value: 1,
        message: i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processor.redactPatternsMinLengthError',
          { defaultMessage: 'At least one pattern is required.' }
        ),
      },
    },
  });

  const { field: prefixField } = useController<RedactFormState, 'prefix'>({
    name: 'prefix',
  });

  const { field: suffixField } = useController<RedactFormState, 'suffix'>({
    name: 'suffix',
  });

  // Ensure there's always at least one pattern field
  useEffect(() => {
    if (fields.length === 0) {
      append({ value: '' });
    }
  }, [fields.length, append]);

  return (
    <>
      <ProcessorFieldSelector
        fieldKey="from"
        helpText={i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processor.redactFieldHelpText',
          { defaultMessage: 'The field containing data to redact.' }
        )}
      />
      <EuiFormRow
        label={i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processor.redactPatternsLabel',
          { defaultMessage: 'Patterns' }
        )}
        helpText={
          <FormattedMessage
            id="xpack.streams.streamDetailView.managementTab.enrichment.processor.redactPatternsHelpText"
            defaultMessage="Grok patterns to match sensitive data. Use format {example} where the semantic name becomes the replacement text."
            values={{
              example: <EuiCode>%&#123;PATTERN:semantic_name&#125;</EuiCode>,
            }}
          />
        }
        fullWidth
      >
        <div>
          {fields.map((field, index) => (
            <PatternField
              key={field.id}
              index={index}
              onRemove={() => remove(index)}
              canRemove={fields.length > 1}
            />
          ))}
          <EuiButtonEmpty
            iconType="plusInCircle"
            onClick={() => append({ value: '' })}
            size="xs"
            data-test-subj="streamsAppRedactAddPatternButton"
          >
            {i18n.translate(
              'xpack.streams.streamDetailView.managementTab.enrichment.processor.redactAddPattern',
              { defaultMessage: 'Add pattern' }
            )}
          </EuiButtonEmpty>
        </div>
      </EuiFormRow>
      <EuiSpacer size="m" />
      <FieldsAccordion>
        <RedactPatternDefinition />
        <EuiSpacer size="m" />
        <EuiFlexGroup gutterSize="m">
          <EuiFlexItem>
            <EuiFormRow
              label={i18n.translate(
                'xpack.streams.streamDetailView.managementTab.enrichment.processor.redactPrefixLabel',
                { defaultMessage: 'Prefix' }
              )}
              helpText={i18n.translate(
                'xpack.streams.streamDetailView.managementTab.enrichment.processor.redactPrefixHelpText',
                { defaultMessage: 'Character(s) prepended to redacted values (default: <)' }
              )}
            >
              <EuiFieldText
                value={prefixField.value ?? ''}
                onChange={prefixField.onChange}
                onBlur={prefixField.onBlur}
                name={prefixField.name}
                placeholder="<"
                data-test-subj="streamsAppRedactPrefixInput"
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow
              label={i18n.translate(
                'xpack.streams.streamDetailView.managementTab.enrichment.processor.redactSuffixLabel',
                { defaultMessage: 'Suffix' }
              )}
              helpText={i18n.translate(
                'xpack.streams.streamDetailView.managementTab.enrichment.processor.redactSuffixHelpText',
                { defaultMessage: 'Character(s) appended to redacted values (default: >)' }
              )}
            >
              <EuiFieldText
                value={suffixField.value ?? ''}
                onChange={suffixField.onChange}
                onBlur={suffixField.onBlur}
                name={suffixField.name}
                placeholder=">"
                data-test-subj="streamsAppRedactSuffixInput"
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        <ProcessorConditionEditor />
      </FieldsAccordion>
      <EuiSpacer size="m" />
      <IgnoreFailureToggle />
      <IgnoreMissingToggle />
    </>
  );
};

interface PatternFieldProps {
  index: number;
  onRemove: () => void;
  canRemove: boolean;
}

const PatternField = ({ index, onRemove, canRemove }: PatternFieldProps) => {
  const { field, fieldState } = useController<RedactFormState, `patterns.${number}.value`>({
    name: `patterns.${index}.value`,
    rules: {
      required: i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.redactPatternRequiredError',
        { defaultMessage: 'Pattern is required.' }
      ),
    },
  });

  // Build options for the combo box with human-readable labels
  const patternOptions: Array<EuiComboBoxOptionOption<string>> = useMemo(() => {
    return COMMON_REDACT_PATTERNS.map((p) => ({
      label: p.label,
      value: `%{${p.pattern}:${p.semanticName}}`,
      'data-test-subj': `redactPattern-${p.pattern}`,
    }));
  }, []);

  // Convert current value to selected option
  // If the value matches a known pattern, show the human-readable label
  const selectedOptions: Array<EuiComboBoxOptionOption<string>> = useMemo(() => {
    if (!field.value) return [];

    // Check if the value matches a known pattern
    const knownPattern = patternOptions.find((opt) => opt.value === field.value);
    if (knownPattern) {
      return [knownPattern];
    }

    // For custom patterns, show the raw value
    return [{ label: field.value, value: field.value }];
  }, [field.value, patternOptions]);

  const handleChange = (options: Array<EuiComboBoxOptionOption<string>>) => {
    if (options.length > 0) {
      // Use the value (pattern syntax) not the label
      field.onChange(options[0].value || options[0].label);
    } else {
      field.onChange('');
    }
  };

  const handleCreateOption = (searchValue: string) => {
    // Allow custom patterns - user might type their own
    field.onChange(searchValue);
  };

  return (
    <EuiFlexGroup gutterSize="s" alignItems="flexStart" style={{ marginBottom: 8 }}>
      <EuiFlexItem>
        <EuiComboBox
          aria-label={i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.processor.redactPatternAriaLabel',
            { defaultMessage: 'Grok pattern' }
          )}
          singleSelection={{ asPlainText: true }}
          options={patternOptions}
          selectedOptions={selectedOptions}
          onChange={handleChange}
          onCreateOption={handleCreateOption}
          placeholder={i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.processor.redactPatternPlaceholder',
            { defaultMessage: 'Select or type a pattern' }
          )}
          isInvalid={fieldState.invalid}
          fullWidth
          compressed
          data-test-subj={`streamsAppRedactPatternInput-${index}`}
          customOptionText={i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.processor.redactCustomOptionText',
            {
              defaultMessage: 'Use custom pattern: {searchValue}',
              values: { searchValue: '{searchValue}' },
            }
          )}
        />
        {fieldState.error && (
          <>
            <EuiSpacer size="xs" />
            <EuiText size="xs" color="danger">
              {fieldState.error.message}
            </EuiText>
          </>
        )}
      </EuiFlexItem>
      {canRemove && (
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="trash"
            color="danger"
            onClick={onRemove}
            aria-label={i18n.translate(
              'xpack.streams.streamDetailView.managementTab.enrichment.processor.redactRemovePattern',
              { defaultMessage: 'Remove pattern' }
            )}
            data-test-subj={`streamsAppRedactRemovePatternButton-${index}`}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
