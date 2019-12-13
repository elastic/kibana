/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { i18n } from '@kbn/i18n';

import { NormalizedField, Field as FieldType } from '../../../../types';
import { UseField, Field } from '../../../../shared_imports';
import { getFieldConfig } from '../../../../lib';
import { PARAMETERS_OPTIONS } from '../../../../constants';
import {
  StoreParameter,
  IndexParameter,
  DocValuesParameter,
  BoostParameter,
  NullValueParameter,
  EagerGlobalOrdinalsParameter,
  NormsParameter,
  SimilarityParameter,
  CopyToParameter,
} from '../../field_parameters';
import { EditFieldSection, EditFieldFormRow, AdvancedSettingsWrapper } from '../edit_field';

const getDefaultValueToggle = (param: string, field: FieldType) => {
  switch (param) {
    case 'boost':
    case 'similarity':
    case 'ignore_above': {
      return field[param] !== undefined && field[param] !== getFieldConfig(param).defaultValue;
    }
    case 'copy_to':
    case 'null_value': {
      return field.null_value !== undefined && field.null_value !== '';
    }
    case 'normalizer': {
      return field.normalizer === undefined;
    }
    default:
      return false;
  }
};

interface Props {
  field: NormalizedField;
}

export const KeywordType = ({ field }: Props) => {
  return (
    <>
      <EditFieldSection>
        <IndexParameter
          config={{ ...getFieldConfig('index_options_keyword') }}
          indexOptions={PARAMETERS_OPTIONS.index_options_keyword}
        />

        {/* normalizer */}
        <EditFieldFormRow
          title={
            <h3>
              {i18n.translate('xpack.idxMgmt.mappingsEditor.normalizerFieldTitle', {
                defaultMessage: 'Use index default normalizer',
              })}
            </h3>
          }
          description={i18n.translate('xpack.idxMgmt.mappingsEditor.normalizerFieldDescription', {
            defaultMessage: 'How to pre-process the keyword prior to indexing.',
          })}
          toggleDefaultValue={getDefaultValueToggle('normalizer', field.source)}
        >
          {isOn =>
            isOn === false && (
              <UseField path="normalizer" config={getFieldConfig('normalizer')} component={Field} />
            )
          }
        </EditFieldFormRow>
      </EditFieldSection>

      <AdvancedSettingsWrapper>
        <EditFieldSection>
          <EagerGlobalOrdinalsParameter />

          {/* ignore_above */}
          <EditFieldFormRow
            title={
              <h3>
                {i18n.translate('xpack.idxMgmt.mappingsEditor.lengthLimitFieldTitle', {
                  defaultMessage: 'Set length limit',
                })}
              </h3>
            }
            description={i18n.translate(
              'xpack.idxMgmt.mappingsEditor.lengthLimitFieldDescription',
              {
                defaultMessage: 'Do not index any string longer than this value.',
              }
            )}
            toggleDefaultValue={getDefaultValueToggle('ignore_above', field.source)}
          >
            <UseField
              path="ignore_above"
              config={getFieldConfig('ignore_above')}
              component={Field}
            />
          </EditFieldFormRow>

          <NormsParameter />
        </EditFieldSection>

        <EditFieldSection>
          <SimilarityParameter
            defaultToggleValue={getDefaultValueToggle('similarity', field.source)}
          />

          {/* split_queries_on_whitespace */}
          <EditFieldFormRow
            title={
              <h3>
                {i18n.translate('xpack.idxMgmt.mappingsEditor.splitQueriesOnWhitespaceFieldTitle', {
                  defaultMessage: 'Split queries on whitespace',
                })}
              </h3>
            }
            description={i18n.translate(
              'xpack.idxMgmt.mappingsEditor.splitQueriesOnWhitespaceFieldDescription',
              {
                defaultMessage:
                  'Whether full text queries should split the input on whitespace when building a query for this field.',
              }
            )}
            formFieldPath="split_queries_on_whitespace"
          />

          <DocValuesParameter />

          <CopyToParameter defaultToggleValue={getDefaultValueToggle('copy_to', field.source)} />

          <NullValueParameter
            defaultToggleValue={getDefaultValueToggle('null_value', field.source)}
          />

          <StoreParameter />

          <BoostParameter defaultToggleValue={getDefaultValueToggle('boost', field.source)} />
        </EditFieldSection>
      </AdvancedSettingsWrapper>
    </>
  );
};
