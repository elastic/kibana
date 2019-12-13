/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiSpacer, EuiDualRange, EuiFormRow, EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { NormalizedField, Field as FieldType } from '../../../../types';
import {
  UseField,
  UseMultiFields,
  Field,
  FieldHook,
  FormDataProvider,
  RangeField,
} from '../../../../shared_imports';
import { getFieldConfig } from '../../../../lib';
import {
  StoreParameter,
  IndexParameter,
  BoostParameter,
  AnalyzersParameter,
  EagerGlobalOrdinalsParameter,
  NormsParameter,
  SimilarityParameter,
  CopyToParameter,
  TermVectorParameter,
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
    case 'copy_to': {
      return field.null_value !== undefined && field.null_value !== '';
    }
    case 'indexPrefixes': {
      if (field.index_prefixes === undefined) {
        return false;
      }

      const minCharsValue = (field.index_prefixes as any).min_chars;
      const defaultMinCharsValue = getFieldConfig('index_prefixes', 'min_chars').defaultValue;
      const maxCharsValue = (field.index_prefixes as any).max_chars;
      const defaultMaxCharsValue = getFieldConfig('index_prefixes', 'min_chars').defaultValue;

      return minCharsValue !== defaultMinCharsValue || maxCharsValue !== defaultMaxCharsValue;
    }
    default:
      return false;
  }
};

const i18nTexts = {
  rangeFieldLabel: i18n.translate('xpack.idxMgmt.mappingsEditor.rangeFieldLabel', {
    defaultMessage: 'Min/max frequency percentage',
  }),
  indexPrefixesRangeFieldLabel: i18n.translate(
    'xpack.idxMgmt.mappingsEditor.indexPrefixesRangeFieldLabel',
    {
      defaultMessage: 'Min/max prefix length',
    }
  ),
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
        <IndexParameter />
      </EditFieldSection>

      <AdvancedSettingsWrapper>
        <AnalyzersParameter field={field} withSearchQuoteAnalyzer={true} />

        <EditFieldSection>
          <EagerGlobalOrdinalsParameter />

          {/* index_phrases */}
          <EditFieldFormRow
            title={
              <h3>
                {i18n.translate('xpack.idxMgmt.mappingsEditor.indexPhrasesFieldTitle', {
                  defaultMessage: 'Index phrases',
                })}
              </h3>
            }
            description={i18n.translate(
              'xpack.idxMgmt.mappingsEditor.indexPhrasesFieldDescription',
              {
                defaultMessage:
                  'Whether to index two-term word combinations into a separate field. Activating this will speed up phrase queries, but could slow down indexing.',
              }
            )}
            formFieldPath="index_phrases"
          />

          {/* index_prefixes */}
          <EditFieldFormRow
            title={
              <h3>
                {i18n.translate('xpack.idxMgmt.mappingsEditor.indexPrefixesFieldTitle', {
                  defaultMessage: 'Set index prefixes',
                })}
              </h3>
            }
            description={i18n.translate(
              'xpack.idxMgmt.mappingsEditor.indexPrefixesFieldDescription',
              {
                defaultMessage:
                  'Whether to index prefixes of 2 and 5 characters into a separate field. Activating this will speed up prefix queries, but could slow down indexing.',
              }
            )}
            toggleDefaultValue={getDefaultValueToggle('indexPrefixes', field.source)}
          >
            <EuiFormRow label={i18nTexts.indexPrefixesRangeFieldLabel} fullWidth>
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
                    fullWidth
                  />
                )}
              </UseMultiFields>
            </EuiFormRow>
          </EditFieldFormRow>

          <NormsParameter />

          {/* position_increment_gap */}
          <EditFieldFormRow
            title={
              <h3>
                {i18n.translate('xpack.idxMgmt.mappingsEditor.positionIncrementGapFieldTitle', {
                  defaultMessage: 'Set position increment gap',
                })}
              </h3>
            }
            description={i18n.translate(
              'xpack.idxMgmt.mappingsEditor.positionIncrementGapFieldDescription',
              {
                defaultMessage:
                  'The number of fake term positions which should be inserted between each element of an array of strings.',
              }
            )}
            toggleDefaultValue={getDefaultValueToggle('position_increment_gap', field.source)}
          >
            <FormDataProvider pathsToWatch="index_options">
              {formData => {
                return (
                  <>
                    <UseField
                      path="position_increment_gap"
                      config={getFieldConfig('position_increment_gap')}
                      component={RangeField}
                      componentProps={{
                        euiFieldProps: {
                          min: 0,
                          max: 200,
                          showInput: true,
                          fullWidth: true,
                        },
                      }}
                    />
                    {formData.index_options !== 'positions' &&
                      formData.index_options !== 'offsets' && (
                        <>
                          <EuiSpacer size="s" />
                          <EuiCallOut
                            title={i18n.translate(
                              'xpack.idxMgmt.mappingsEditor.positionsErrorTitle',
                              {
                                defaultMessage: 'Positions not enabled.',
                              }
                            )}
                            color="danger"
                            iconType="alert"
                          >
                            <p>
                              {i18n.translate(
                                'xpack.idxMgmt.mappingsEditor.positionsErrorMessage',
                                {
                                  defaultMessage:
                                    'You need to set the index options (under the "Searchable" toggle) to "Positions" or "Offsets" in order to be able to change the position increment gap.',
                                }
                              )}
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
          <SimilarityParameter
            defaultToggleValue={getDefaultValueToggle('similarity', field.source)}
          />

          <TermVectorParameter
            field={field}
            defaultToggleValue={getDefaultValueToggle('term_vector', field.source)}
          />

          {/* fielddata */}
          <EditFieldFormRow
            title={
              <h3>
                {i18n.translate('xpack.idxMgmt.mappingsEditor.fielddataTitle', {
                  defaultMessage: 'Fielddata',
                })}
              </h3>
            }
            description={i18n.translate('xpack.idxMgmt.mappingsEditor.fielddataDescription', {
              defaultMessage:
                'Whether to use in-memory fielddata for sorting, aggregations, or scripting.',
            })}
            formFieldPath="fielddata"
          >
            {/* fielddata_frequency_filter */}
            <EuiFormRow label={i18nTexts.rangeFieldLabel} fullWidth>
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
                {({ min, max }) => {
                  return (
                    <EuiDualRange
                      min={0}
                      max={100}
                      value={[min.value as number, max.value as number]}
                      onChange={onFrequencyFilterChange(min, max)}
                      showInput
                      fullWidth
                    />
                  );
                }}
              </UseMultiFields>
            </EuiFormRow>

            <EuiSpacer />

            <UseField
              path="fielddata_frequency_filter.min_segment_size"
              config={getFieldConfig('fielddata_frequency_filter', 'min_segment_size')}
              component={Field}
            />
          </EditFieldFormRow>

          <CopyToParameter defaultToggleValue={getDefaultValueToggle('copy_to', field.source)} />

          <StoreParameter />

          <BoostParameter defaultToggleValue={getDefaultValueToggle('boost', field.source)} />
        </EditFieldSection>
      </AdvancedSettingsWrapper>
    </>
  );
});
