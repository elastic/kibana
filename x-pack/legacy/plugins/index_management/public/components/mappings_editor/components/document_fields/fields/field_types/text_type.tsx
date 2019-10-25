/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import {
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiRange,
  EuiDualRange,
  EuiFormRow,
} from '@elastic/eui';

import { NormalizedField } from '../../../../types';
import { UseField, Field, FieldHook } from '../../../../shared_imports';
import { getFieldConfig } from '../../../../lib';
import { PARAMETERS_OPTIONS } from '../../../../constants';
import { EditFieldSection, EditFieldFormRow, AdvancedSettingsWrapper } from '../edit_field';

interface Props {
  field: NormalizedField;
}

export const TextType = React.memo(({ field }: Props) => {
  const onFrequencyFilterChange = (minField: FieldHook, maxField: FieldHook) => ([
    min,
    max,
  ]: any) => {
    minField.setValue(min === '' ? '' : parseInt(min, 10));
    maxField.setValue(max === '' ? '' : parseInt(max, 10));
  };

  return (
    <>
      <EditFieldSection>
        <EditFieldFormRow
          title={<h3>Store field value</h3>}
          description="This is description text."
          formFieldPath="store"
        />

        <EditFieldFormRow
          title={<h3>Searchable</h3>}
          description="This is description text."
          formFieldPath="index"
          direction="column"
        >
          {/* Index options */}
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem>
              <UseField
                path="index_options"
                config={getFieldConfig('index_options')}
                component={Field}
                componentProps={{
                  euiFieldProps: {
                    options: PARAMETERS_OPTIONS.index_options,
                    style: { maxWidth: 300 },
                  },
                }}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="s" color="subdued">
                This is description text.
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EditFieldFormRow>

        <EditFieldFormRow
          title={<h3>Fielddata</h3>}
          description="This is description text."
          formFieldPath="fielddata"
        >
          <EuiFormRow label="Range (Min/Max %):">
            <UseField
              path="fielddata_frequency_filter.min"
              config={getFieldConfig('fielddata_frequency_filter', 'min')}
            >
              {minField => (
                <UseField
                  path="fielddata_frequency_filter.max"
                  config={getFieldConfig('fielddata_frequency_filter', 'max')}
                >
                  {maxField => (
                    <EuiDualRange
                      min={0}
                      max={100}
                      value={[minField.value as number, maxField.value as number]}
                      onChange={onFrequencyFilterChange(minField, maxField)}
                      showInput
                    />
                  )}
                </UseField>
              )}
            </UseField>
          </EuiFormRow>

          <UseField
            path="fielddata_frequency_filter.min_segment_size"
            config={getFieldConfig('fielddata_frequency_filter', 'min_segment_size')}
            component={Field}
          />
        </EditFieldFormRow>
      </EditFieldSection>

      <EuiSpacer size="m" />

      <AdvancedSettingsWrapper>
        <div>Here will come the advanced settings</div>
      </AdvancedSettingsWrapper>
    </>
  );
});
