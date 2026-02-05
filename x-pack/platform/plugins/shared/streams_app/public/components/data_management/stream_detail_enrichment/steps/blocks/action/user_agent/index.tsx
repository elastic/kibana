/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiSpacer,
  EuiFieldText,
  EuiFormRow,
  EuiComboBox,
  EuiBetaBadge,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useFormContext, useController } from 'react-hook-form';
import type { UserAgentProperty } from '@kbn/streamlang';
import { ProcessorFieldSelector } from '../processor_field_selector';
import { FieldsAccordion } from '../optional_fields_accordion';
import { ProcessorConditionEditor } from '../processor_condition_editor';
import { IgnoreFailureToggle, IgnoreMissingToggle } from '../ignore_toggles';
import { ToggleField } from '../toggle_field';
import type {
  ExtractBooleanFields,
  ProcessorFormState,
  UserAgentFormState,
} from '../../../../types';

const userAgentPropertyOptions: Array<EuiComboBoxOptionOption<UserAgentProperty>> = [
  { label: 'name', value: 'name' },
  { label: 'os', value: 'os' },
  { label: 'device', value: 'device' },
  { label: 'original', value: 'original' },
  { label: 'version', value: 'version' },
];

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

const RegexFileField = () => {
  const { register } = useFormContext<UserAgentFormState>();
  const { ref, ...inputProps } = register('regex_file');

  return (
    <EuiFormRow
      label={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.userAgentRegexFileLabel',
        { defaultMessage: 'Regex file (optional)' }
      )}
      helpText={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.userAgentRegexFileHelpText',
        {
          defaultMessage:
            'File containing the regular expressions used to parse the user agent string. Located in config/ingest-user-agent directory.',
        }
      )}
      fullWidth
    >
      <EuiFieldText {...inputProps} inputRef={ref} />
    </EuiFormRow>
  );
};

const PropertiesField = () => {
  const { field } = useController<UserAgentFormState, 'properties'>({
    name: 'properties',
  });

  const handleChange = (options: Array<EuiComboBoxOptionOption<UserAgentProperty>>) => {
    field.onChange(options.map((option) => option.value as UserAgentProperty));
  };

  const selectedOptions = (field.value ?? []).map((value) => ({
    label: value,
    value,
  }));

  return (
    <EuiFormRow
      label={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.userAgentPropertiesLabel',
        { defaultMessage: 'Properties' }
      )}
      helpText={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.userAgentPropertiesHelpText',
        {
          defaultMessage:
            'Properties to add to the target field. Defaults to all: name, os, device, original, version.',
        }
      )}
      fullWidth
    >
      <EuiComboBox
        compressed
        fullWidth
        options={userAgentPropertyOptions}
        selectedOptions={selectedOptions}
        onChange={handleChange}
        isClearable
        data-test-subj="streamsAppUserAgentPropertiesSelector"
      />
    </EuiFormRow>
  );
};

const ExtractDeviceTypeToggle = () => {
  return (
    <ToggleField
      name={'extract_device_type' as ExtractBooleanFields<ProcessorFormState>}
      label={
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            {i18n.translate(
              'xpack.streams.streamDetailView.managementTab.enrichment.processor.userAgentExtractDeviceTypeLabel',
              { defaultMessage: 'Extract device type' }
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBetaBadge
              size="s"
              label="Beta"
              tooltipContent={i18n.translate(
                'xpack.streams.streamDetailView.managementTab.enrichment.processor.userAgentExtractDeviceTypeBetaTooltip',
                { defaultMessage: 'This functionality is in beta and is subject to change.' }
              )}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      helpText={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.userAgentExtractDeviceTypeHelpText',
        {
          defaultMessage: 'Extracts device type from the user agent string on a best-effort basis.',
        }
      )}
    />
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
        <RegexFileField />
        <EuiSpacer size="m" />
        <PropertiesField />
        <EuiSpacer size="m" />
        <ExtractDeviceTypeToggle />
        <EuiSpacer size="m" />
        <ProcessorConditionEditor />
      </FieldsAccordion>
      <EuiSpacer size="m" />
      <IgnoreFailureToggle />
      <IgnoreMissingToggle />
    </>
  );
};
