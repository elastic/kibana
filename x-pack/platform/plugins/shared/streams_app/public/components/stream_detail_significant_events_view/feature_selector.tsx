/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow, EuiText, EuiSpacer, EuiComboBox, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Feature } from '@kbn/streams-schema';
import React from 'react';

export interface FeatureSelectorProps {
  features: Feature[];
  selectedFeatures: Feature[];
  onFeaturesChange: (features: Feature[]) => void;
}

export function FeaturesSelector({
  features,
  selectedFeatures,
  onFeaturesChange,
}: FeatureSelectorProps) {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFormRow
      label={
        <EuiText css={{ fontWeight: euiTheme.font.weight.semiBold }} size="xs">
          {i18n.translate('xpack.streams.significantEvents.featuresSelector.featuresLabel', {
            defaultMessage: 'Select features',
          })}
        </EuiText>
      }
      css={{ width: '100%', maxWidth: 450 }}
    >
      <>
        <EuiSpacer size="s" />
        <EuiComboBox
          placeholder={i18n.translate(
            'xpack.streams.significantEvents.featuresSelector.featuresPlaceholder',
            {
              defaultMessage: 'Select features',
            }
          )}
          options={features.map((feature) => ({ label: feature.name, value: feature }))}
          selectedOptions={selectedFeatures.map((feature) => ({
            label: feature.name,
            value: feature,
          }))}
          onChange={(selected) => {
            onFeaturesChange(selected.map((option) => option.value) as Feature[]);
          }}
        />
      </>
    </EuiFormRow>
  );
}
