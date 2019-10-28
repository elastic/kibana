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
  EuiCallOut,
} from '@elastic/eui';

import { NormalizedField, Field as FieldType } from '../../../../types';
import {
  UseField,
  UseMultiFields,
  Field,
  FieldHook,
  FormDataProvider,
} from '../../../../shared_imports';
import { getFieldConfig } from '../../../../lib';
import { PARAMETERS_OPTIONS } from '../../../../constants';
import { SelectWithCustom } from '../../../form';
import {
  StoreParameter,
  IndexParameter,
  BoostParameter,
  EagerGlobalOrdinalsParameter,
  NormsParameter,
  SimilarityParameter,
} from '../../field_parameters';
import { EditFieldSection, EditFieldFormRow, AdvancedSettingsWrapper } from '../edit_field';

interface Props {
  field: NormalizedField;
}

const getDefaultValueToggle = (param: string, field: FieldType) => {
  switch (param) {
    case 'boost':
    case 'position_increment_gap':
    case 'similarity':
    case 'term_vector': {
      return field[param] !== undefined && field[param] !== getFieldConfig(param).defaultValue;
    }
    case 'analyzers': {
      return field.search_analyzer !== undefined && field.search_analyzer !== field.analyzer;
    }
    case 'indexPrefixes': {
      return (
        field.index_prefixes !== undefined &&
        ((field.index_prefixes as any).min_chars !==
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
        <StoreParameter />

        {/* index */}
        <IndexParameter />

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
          <BoostParameter defaultToggleValue={getDefaultValueToggle('boost', field.source)} />

          {/* eager_global_ordinals */}
          <EagerGlobalOrdinalsParameter />

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

          {/* norms */}
          <NormsParameter />

          {/* position_increment_gap */}
          <EditFieldFormRow
            title={<h3>Set position increment gap</h3>}
            description="This is description text."
            toggleDefaultValue={getDefaultValueToggle('position_increment_gap', field.source)}
          >
            <FormDataProvider pathsToWatch="index_options">
              {formData => {
                return (
                  <>
                    <UseField
                      path="position_increment_gap"
                      config={getFieldConfig('position_increment_gap')}
                    >
                      {positionIncrementGapField => (
                        <EuiRange
                          min={0}
                          max={200}
                          value={positionIncrementGapField.value as string}
                          onChange={positionIncrementGapField.onChange as any}
                          showInput
                        />
                      )}
                    </UseField>
                    {formData.index_options !== 'positions' &&
                      formData.index_options !== 'offsets' && (
                        <>
                          <EuiSpacer size="s" />
                          <EuiCallOut title="Postions not enabled." color="danger" iconType="alert">
                            <p>
                              You need to set the index options to "positions" or "offsets" in order
                              to be able to change the position increment gap.
                            </p>
                          </EuiCallOut>
                        </>
                      )}
                  </>
                );
              }}
            </FormDataProvider>
          </EditFieldFormRow>
        </EditFieldSection>

        <EditFieldSection>
          {/* similarity */}
          <SimilarityParameter
            defaultToggleValue={getDefaultValueToggle('similarity', field.source)}
          />

          {/* term vector */}
          <EditFieldFormRow
            title={<h3>Set term vector</h3>}
            description="This is description text."
            direction="column"
            toggleDefaultValue={getDefaultValueToggle('term_vector', field.source)}
          >
            <FormDataProvider pathsToWatch="term_vector">
              {formData => (
                <>
                  <UseField
                    path="term_vector"
                    config={getFieldConfig('term_vector')}
                    component={Field}
                    componentProps={{ euiFieldProps: { options: PARAMETERS_OPTIONS.term_vector } }}
                  />
                  {formData.term_vector === 'with_positions_offsets' && (
                    <>
                      <EuiSpacer size="s" />
                      <EuiCallOut color="warning">
                        <p>
                          Setting "With positions offsets" will double the size of a field’s index.
                        </p>
                      </EuiCallOut>
                    </>
                  )}
                </>
              )}
            </FormDataProvider>
          </EditFieldFormRow>
        </EditFieldSection>
      </AdvancedSettingsWrapper>
    </>
  );
});
