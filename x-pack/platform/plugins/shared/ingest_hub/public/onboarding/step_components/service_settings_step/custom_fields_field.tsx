/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { CustomField } from '../../common/policy_settings';
import type { CustomFieldsErrors } from './integration_settings';

export interface CustomFieldsFieldProps {
  value: CustomField[];
  onChange: (fields: CustomField[]) => void;
  /** Validation errors, from `getCustomFieldsErrors`. */
  errors?: CustomFieldsErrors;
  /** Whether a selected service is deployed through a template that cannot take custom fields. */
  hasServicesIgnoringCustomFields?: boolean;
}

/**
 * Name and value pairs added to all data collected from the integration, as Fleet's Add integration
 * offers them (`global_data_tags`). Optional: none adds no fields.
 */
export function CustomFieldsField({
  value,
  onChange,
  errors,
  hasServicesIgnoringCustomFields = false,
}: CustomFieldsFieldProps) {
  const removeLabel = i18n.translate(
    'xpack.ingestHub.integrationSettings.customFields.removeAriaLabel',
    { defaultMessage: 'Remove custom field' }
  );
  const updateField = (index: number, change: Partial<CustomField>) =>
    onChange(value.map((field, i) => (i === index ? { ...field, ...change } : field)));

  return (
    <EuiFormRow
      fullWidth
      label={i18n.translate('xpack.ingestHub.integrationSettings.customFields.label', {
        defaultMessage: 'Custom fields',
      })}
      helpText={i18n.translate('xpack.ingestHub.integrationSettings.customFields.helpText', {
        defaultMessage:
          'Add name and value pairs to all data collected from this integration. Names cannot contain spaces.',
      })}
      isInvalid={!!errors?.list}
      error={errors?.list}
    >
      <div>
        {value.map((field, index) => (
          <React.Fragment key={index}>
            {index > 0 && <EuiSpacer size="s" />}
            <EuiFlexGroup
              gutterSize="s"
              alignItems="flexStart"
              responsive={false}
              data-test-subj={`sharedSettingsCustomField-${index}`}
            >
              <EuiFlexItem>
                <EuiFormRow
                  fullWidth
                  isInvalid={!!errors?.rows[index]?.name}
                  error={errors?.rows[index]?.name}
                >
                  <EuiFieldText
                    fullWidth
                    compressed
                    value={field.name}
                    onChange={(e) => updateField(index, { name: e.target.value })}
                    isInvalid={!!errors?.rows[index]?.name}
                    placeholder={i18n.translate(
                      'xpack.ingestHub.integrationSettings.customFields.namePlaceholder',
                      { defaultMessage: 'Name' }
                    )}
                    aria-label={i18n.translate(
                      'xpack.ingestHub.integrationSettings.customFields.nameAriaLabel',
                      { defaultMessage: 'Custom field name' }
                    )}
                    data-test-subj={`sharedSettingsCustomFieldName-${index}`}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFormRow
                  fullWidth
                  isInvalid={!!errors?.rows[index]?.value}
                  error={errors?.rows[index]?.value}
                >
                  <EuiFieldText
                    fullWidth
                    compressed
                    value={field.value}
                    onChange={(e) => updateField(index, { value: e.target.value })}
                    isInvalid={!!errors?.rows[index]?.value}
                    placeholder={i18n.translate(
                      'xpack.ingestHub.integrationSettings.customFields.valuePlaceholder',
                      { defaultMessage: 'Value' }
                    )}
                    aria-label={i18n.translate(
                      'xpack.ingestHub.integrationSettings.customFields.valueAriaLabel',
                      { defaultMessage: 'Custom field value' }
                    )}
                    data-test-subj={`sharedSettingsCustomFieldValue-${index}`}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiToolTip content={removeLabel} disableScreenReaderOutput>
                  <EuiButtonIcon
                    iconType="trash"
                    size="s"
                    color="danger"
                    aria-label={removeLabel}
                    onClick={() => onChange(value.filter((_, i) => i !== index))}
                    data-test-subj={`sharedSettingsCustomFieldRemove-${index}`}
                  />
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
          </React.Fragment>
        ))}
        <EuiButtonEmpty
          size="xs"
          iconType="plusCircle"
          flush="left"
          onClick={() => onChange([...value, { name: '', value: '' }])}
          data-test-subj="sharedSettingsCustomFieldsAdd"
        >
          {i18n.translate('xpack.ingestHub.integrationSettings.customFields.add', {
            defaultMessage: 'Add field',
          })}
        </EuiButtonEmpty>
        {hasServicesIgnoringCustomFields && (
          <EuiText size="xs" color="subdued" data-test-subj="sharedSettingsCustomFieldsEcfNote">
            <p>
              {i18n.translate('xpack.ingestHub.integrationSettings.customFields.ecfNote', {
                defaultMessage:
                  'Services deployed through Elastic Cloud Forwarder do not support custom fields yet.',
              })}
            </p>
          </EuiText>
        )}
      </div>
    </EuiFormRow>
  );
}
