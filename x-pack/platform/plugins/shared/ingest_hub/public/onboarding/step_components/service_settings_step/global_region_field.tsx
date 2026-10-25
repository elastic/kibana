/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiComboBox, EuiFormRow, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { AWS_REGION_OPTIONS } from './field_config';

interface GlobalRegionFieldProps {
  value: string;
  onChange: (region: string) => void;
  /** Whether the region was edited, so the empty prefilled form does not open with an error. */
  touched: boolean;
  onTouched: () => void;
  isDisabled?: boolean;
}

export function GlobalRegionField({
  value,
  onChange,
  touched,
  onTouched,
  isDisabled = false,
}: GlobalRegionFieldProps) {
  const isInvalid = touched && !value.trim();

  const comboBox = (
    <EuiComboBox
      fullWidth
      aria-label={i18n.translate('xpack.ingestHub.serviceSettingsStep.globalRegion.ariaLabel', {
        defaultMessage: 'Global AWS region',
      })}
      singleSelection={{ asPlainText: true }}
      options={AWS_REGION_OPTIONS}
      selectedOptions={value ? [{ label: value }] : []}
      onChange={(selected) => {
        onTouched();
        onChange(selected[0]?.label ?? '');
      }}
      onCreateOption={(searchValue) => {
        onTouched();
        onChange(searchValue);
      }}
      isInvalid={isInvalid}
      isDisabled={isDisabled}
      customOptionText='Use "{searchValue}" as region'
      placeholder={i18n.translate('xpack.ingestHub.serviceSettingsStep.globalRegion.placeholder', {
        defaultMessage: 'Select or enter a region',
      })}
      data-test-subj="serviceSettingsStep-globalRegion"
    />
  );

  return (
    <EuiFormRow
      fullWidth
      label={i18n.translate('xpack.ingestHub.serviceSettingsStep.globalRegion.label', {
        defaultMessage: 'Global AWS region',
      })}
      isInvalid={isInvalid}
      error={
        isInvalid ? (
          <span data-test-subj="serviceSettingsStep-globalRegionError">
            {i18n.translate('xpack.ingestHub.serviceSettingsStep.globalRegion.error', {
              defaultMessage: 'A global region is required.',
            })}
          </span>
        ) : undefined
      }
    >
      {isDisabled ? (
        <EuiToolTip
          content={i18n.translate(
            'xpack.ingestHub.serviceSettingsStep.globalRegion.disabledTooltip',
            {
              defaultMessage:
                'Region cannot be changed after services have been deployed. To use a different region, start a new session.',
            }
          )}
        >
          {/* span needed: disabled EuiComboBox has pointer-events:none; the span intercepts
              hover events so the tooltip fires even when the field is non-interactive. */}
          <span tabIndex={0} style={{ display: 'block' }}>
            {comboBox}
          </span>
        </EuiToolTip>
      ) : (
        comboBox
      )}
    </EuiFormRow>
  );
}
