/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiSpacer, EuiCallOut, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { NormalizedField, Field as FieldType } from '../../../../types';
import { UseField, Field, FormDataProvider, CheckBoxField } from '../../../../shared_imports';
import { getFieldConfig } from '../../../../lib';
import { PARAMETERS_OPTIONS } from '../../../../constants';
import {
  StoreParameter,
  IndexParameter,
  AnalyzerParameter,
  NormsParameter,
  SimilarityParameter,
} from '../../field_parameters';
import { EditFieldSection, EditFieldFormRow, AdvancedSettingsWrapper } from '../edit_field';

interface Props {
  field: NormalizedField;
}

const getDefaultValueToggle = (param: string, field: FieldType) => {
  switch (param) {
    case 'similarity':
    case 'term_vector': {
      return field[param] !== undefined && field[param] !== getFieldConfig(param).defaultValue;
    }
    case 'analyzers': {
      return field.search_analyzer !== undefined && field.search_analyzer !== field.analyzer;
    }
    default:
      return false;
  }
};

export const SearchAsYouType = React.memo(({ field }: Props) => {
  return (
    <>
      <EditFieldSection>
        {/* store */}
        <StoreParameter />

        {/* index */}
        <IndexParameter />
      </EditFieldSection>

      <AdvancedSettingsWrapper>
        {/* Analyzers */}
        <EditFieldSection
          title={i18n.translate('xpack.idxMgmt.mappingsEditor.analyzersSectionTitle', {
            defaultMessage: 'Analysers',
          })}
        >
          <AnalyzerParameter
            path="analyzer"
            label={i18n.translate('xpack.idxMgmt.mappingsEditor.indexSearchAnalyzerFieldLabel', {
              defaultMessage: 'Index + search analyzer',
            })}
            defaultValue={field.source.analyzer}
          />

          <EuiSpacer size="s" />

          <UseField
            path="useSameAnalyzerForSearch"
            component={CheckBoxField}
            config={{
              label: i18n.translate(
                'xpack.idxMgmt.mappingsEditor.analyzers.useSameAnalyzerIndexAnSearch',
                {
                  defaultMessage: 'Use the same analyzers for index and searching',
                }
              ),
              defaultValue: true,
            }}
          />

          <FormDataProvider pathsToWatch="useSameAnalyzerForSearch">
            {({ useSameAnalyzerForSearch }) =>
              useSameAnalyzerForSearch ? null : (
                <>
                  <EuiSpacer />
                  <AnalyzerParameter
                    path="search_analyzer"
                    defaultValue={field.source.search_analyzer}
                    config={getFieldConfig('search_analyzer')}
                  />
                </>
              )
            }
          </FormDataProvider>

          <EuiSpacer />

          <AnalyzerParameter
            path="search_quote_analyzer"
            defaultValue={field.source.search_quote_analyzer}
            config={getFieldConfig('search_quote_analyzer')}
          />
        </EditFieldSection>

        <EditFieldSection>
          {/* norms */}
          <NormsParameter />

          {/* similarity */}
          <SimilarityParameter
            defaultToggleValue={getDefaultValueToggle('similarity', field.source)}
          />

          {/* term vector */}
          <EditFieldFormRow
            title={
              <h3>
                {i18n.translate('xpack.idxMgmt.mappingsEditor.termVectorFieldTitle', {
                  defaultMessage: 'Set term vector',
                })}
              </h3>
            }
            description={i18n.translate('xpack.idxMgmt.mappingsEditor.termVectorFieldDescription', {
              defaultMessage: 'Whether term vectors should be stored for an analyzed field.',
            })}
            direction="column"
            toggleDefaultValue={getDefaultValueToggle('term_vector', field.source)}
          >
            <FormDataProvider pathsToWatch="term_vector">
              {formData => (
                <>
                  <EuiFlexGroup alignItems="center">
                    <EuiFlexItem grow={false}>
                      <UseField
                        path="term_vector"
                        config={getFieldConfig('term_vector')}
                        component={Field}
                        componentProps={{
                          euiFieldProps: {
                            options: PARAMETERS_OPTIONS.term_vector,
                            style: { minWidth: 300 },
                          },
                        }}
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>

                  {formData.term_vector === 'with_positions_offsets' && (
                    <>
                      <EuiSpacer size="s" />
                      <EuiCallOut color="warning">
                        <p>
                          {i18n.translate(
                            'xpack.idxMgmt.mappingsEditor.termVectorFieldWarningMessage',
                            {
                              defaultMessage:
                                'Setting "With positions & offsets" will double the size of a field’s index.',
                            }
                          )}
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
