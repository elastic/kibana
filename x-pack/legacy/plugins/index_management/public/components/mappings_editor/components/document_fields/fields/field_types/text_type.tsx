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

import { NormalizedField, Field as FieldType } from '../../../../types';
import { UseField, UseMultiFields, Field, FieldHook } from '../../../../shared_imports';
import { getFieldConfig } from '../../../../lib';
import { PARAMETERS_OPTIONS } from '../../../../constants';
import { SelectWithCustom } from '../../../form';
import { EditFieldSection, EditFieldFormRow, AdvancedSettingsWrapper } from '../edit_field';

interface Props {
  field: NormalizedField;
}

const getDefaultValueToggle = (toggleId: string, field: FieldType) => {
  switch (toggleId) {
    case 'analyzers': {
      return field.search_analyzer !== undefined && field.search_analyzer !== field.analyzer;
    }
    case 'boost': {
      return field.boost !== undefined && field.boost !== getFieldConfig('boost').defaultValue;
    }
    case 'indexPrefixes': {
      return (
        field.index_prefixes !== undefined &&
        (field.index_prefixes.min_chars !==
          getFieldConfig('index_prefixes', 'min_chars').defaultValue ||
          (field.index_prefixes as any).max_chars !==
            getFieldConfig('index_prefixes', 'max_chars').defaultValue)
      );
    }
    default:
      return false;
  }
};

export const TextType = React.memo(({ field }: Props) => {
  const onFrequencyFilterChange = (minField: FieldHook, maxField: FieldHook) => ([
    min,
    max,
  ]: any) => {
    minField.setValue(min);
    maxField.setValue(max);
  };

  const onIndexPrefixesChanage = (minField: FieldHook, maxField: FieldHook) => ([
    min,
    max,
  ]: any) => {
    minField.setValue(min);
    maxField.setValue(max);
  };

  return (
    <>
      <EditFieldSection>
        {/* store */}
        <EditFieldFormRow
          title={<h3>Store field value</h3>}
          description="This is description text."
          formFieldPath="store"
        />

        {/* index */}
        <EditFieldFormRow
          title={<h3>Searchable</h3>}
          description="This is description text."
          formFieldPath="index"
          direction="column"
        >
          {/* index_options */}
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

        {/* fielddata */}
        <EditFieldFormRow
          title={<h3>Fielddata</h3>}
          description="This is description text."
          formFieldPath="fielddata"
        >
          {/* fielddata_frequency_filter */}
          <EuiFormRow label="Range (Min / Max %):">
            <UseMultiFields
              fields={{
                min: {
                  path: 'fielddata_frequency_filter.min',
                  config: getFieldConfig('fielddata_frequency_filter', 'min'),
                },
                max: {
                  path: 'fielddata_frequency_filter.max',
                  config: getFieldConfig('fielddata_frequency_filter', 'max'),
                },
              }}
            >
              {({ min, max }) => (
                <EuiDualRange
                  min={0}
                  max={100}
                  value={[min.value as number, max.value as number]}
                  onChange={onFrequencyFilterChange(min, max)}
                  showInput
                />
              )}
            </UseMultiFields>
          </EuiFormRow>

          <EuiSpacer />

          <UseField
            path="fielddata_frequency_filter.min_segment_size"
            config={getFieldConfig('fielddata_frequency_filter', 'min_segment_size')}
            component={Field}
          />
        </EditFieldFormRow>
      </EditFieldSection>

      <AdvancedSettingsWrapper>
        {/* Analyzers */}
        <EditFieldSection title="Analysers">
          <EditFieldFormRow
            title={<h3>Use different analyzers for index and searching</h3>}
            sizeTitle={'xxs'}
            toggleDefaultValue={getDefaultValueToggle('analyzers', field.source)}
          >
            {isOn => (
              <>
                <div>
                  <SelectWithCustom
                    path="analyzer"
                    label={isOn ? 'Index analyzer' : 'Index + search analyzer'}
                    options={PARAMETERS_OPTIONS.analyzer!}
                    config={getFieldConfig('analyzer')}
                    defaultValue={field.source.analyzer}
                  />
                </div>
                {isOn && (
                  <>
                    <EuiSpacer />
                    <div>
                      <SelectWithCustom
                        path="search_analyzer"
                        options={PARAMETERS_OPTIONS.analyzer!}
                        config={getFieldConfig('search_analyzer')}
                        defaultValue={field.source.search_analyzer}
                      />
                    </div>
                  </>
                )}
                <EuiSpacer />
                <div>
                  <SelectWithCustom
                    path="search_quote_analyzer"
                    options={PARAMETERS_OPTIONS.analyzer!}
                    config={getFieldConfig('search_quote_analyzer')}
                    defaultValue={field.source.search_quote_analyzer}
                  />
                </div>
              </>
            )}
          </EditFieldFormRow>
        </EditFieldSection>

        <EditFieldSection>
          {/* boost */}
          <EditFieldFormRow
            title={<h3>Set boost level</h3>}
            description="This is description text."
            toggleDefaultValue={getDefaultValueToggle('boost', field.source)}
          >
            {/* Boost level */}
            <UseField path="boost" config={getFieldConfig('boost')}>
              {boostField => (
                <EuiRange
                  min={1}
                  max={20}
                  value={boostField.value as string}
                  onChange={boostField.onChange as any}
                  showInput
                />
              )}
            </UseField>
          </EditFieldFormRow>

          {/* eager_global_ordinals */}
          <EditFieldFormRow
            title={<h3>Use eager global ordinals</h3>}
            description="This is description text."
            formFieldPath="eager_global_ordinals"
          />

          {/* index_phrases */}
          <EditFieldFormRow
            title={<h3>Index phrases</h3>}
            description="This is description text."
            formFieldPath="index_phrases"
          />

          {/* index_prefixes */}
          <EditFieldFormRow
            title={<h3>Set index prefixes</h3>}
            description="This is description text."
            toggleDefaultValue={getDefaultValueToggle('indexPrefixes', field.source)}
          >
            <EuiFormRow label="Range (Min / Max):">
              <UseMultiFields
                fields={{
                  min: {
                    path: 'index_prefixes.min_chars',
                    config: getFieldConfig('index_prefixes', 'min_chars'),
                  },
                  max: {
                    path: 'index_prefixes.max_chars',
                    config: getFieldConfig('index_prefixes', 'max_chars'),
                  },
                }}
              >
                {({ min, max }) => (
                  <EuiDualRange
                    min={0}
                    max={20}
                    value={[min.value as number, max.value as number]}
                    onChange={onIndexPrefixesChanage(min, max)}
                    showInput
                  />
                )}
              </UseMultiFields>
            </EuiFormRow>
          </EditFieldFormRow>
        </EditFieldSection>
      </AdvancedSettingsWrapper>
    </>
  );
});
