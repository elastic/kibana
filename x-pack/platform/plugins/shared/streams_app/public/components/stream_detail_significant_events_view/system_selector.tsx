/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow, EuiText, EuiSpacer, EuiComboBox, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { type System } from '@kbn/streams-schema';
import React from 'react';

export const ALL_DATA_OPTION = {
  label: 'All data',
  value: { name: 'All data', type: 'all_data' as const },
};

export interface SystemSelectorProps {
  systems: System[];
  selectedSystems: System[];
  onSystemsChange: (systems: System[]) => void;
}

export function SystemsSelector({
  isDisabled,
  systems,
  selectedSystems,
  onSystemsChange,
}: SystemSelectorProps & { isDisabled: boolean }) {
  const { euiTheme } = useEuiTheme();
  const options = systems.map((system) => ({ label: system.name, value: system }));

  return (
    <EuiFormRow
      label={
        <EuiText css={{ fontWeight: euiTheme.font.weight.semiBold }} size="xs">
          {i18n.translate('xpack.streams.significantEvents.systemsSelector.systemsLabel', {
            defaultMessage: 'Select systems',
          })}
        </EuiText>
      }
      css={{ width: '100%', maxWidth: 450 }}
    >
      <>
        <EuiSpacer size="s" />
        <EuiComboBox
          placeholder={i18n.translate(
            'xpack.streams.significantEvents.systemsSelector.systemsPlaceholder',
            {
              defaultMessage: 'Select systems',
            }
          )}
          options={options}
          isDisabled={systems.length === 0 || isDisabled}
          selectedOptions={selectedSystems.map((system) => ({
            label: system.name,
            value: system,
          }))}
          onChange={(selected) => {
            onSystemsChange(selected.map((option) => option.value as System));
          }}
        />
      </>
    </EuiFormRow>
  );
}
