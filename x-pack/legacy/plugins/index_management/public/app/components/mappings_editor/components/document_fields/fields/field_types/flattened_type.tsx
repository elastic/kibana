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
  DocValuesParameter,
  IndexParameter,
  BoostParameter,
  EagerGlobalOrdinalsParameter,
  NullValueParameter,
  SimilarityParameter,
} from '../../field_parameters';
import { EditFieldSection, EditFieldFormRow, AdvancedSettingsWrapper } from '../edit_field';

interface Props {
  field: NormalizedField;
}

const getDefaultValueToggle = (param: string, field: FieldType) => {
  switch (param) {
    case 'boost':
    case 'similarity': {
      return field[param] !== undefined && field[param] !== getFieldConfig(param).defaultValue;
    }
    case 'null_value': {
      return field.null_value !== undefined && field.null_value !== '';
    }
    default:
      return false;
  }
};

export const FlattenedType = React.memo(({ field }: Props) => {
  return (
    <>
      <EditFieldSection>
        <IndexParameter
          config={getFieldConfig('index_options_flattened')}
          indexOptions={PARAMETERS_OPTIONS.index_options_flattened}
        />
      </EditFieldSection>

      <AdvancedSettingsWrapper>
        <EditFieldSection>
          <EagerGlobalOrdinalsParameter />

          {/* depth_limit */}
          <EditFieldFormRow
            title={
              <h3>
                {i18n.translate('xpack.idxMgmt.mappingsEditor.depthLimitTitle', {
                  defaultMessage: 'Customize depth limit',
                })}
              </h3>
            }
            description={i18n.translate('xpack.idxMgmt.mappingsEditor.depthLimitDescription', {
              defaultMessage:
                'The maximum allowed depth of the flattened object field, in terms of nested inner objects. Defaults to 20.',
            })}
          >
            <UseField path="depth_limit" config={getFieldConfig('depth_limit')} component={Field} />
          </EditFieldFormRow>

          {/* ignore_above */}
          <EditFieldFormRow
            title={
              <h3>
                {i18n.translate('xpack.idxMgmt.mappingsEditor.leafLengthLimitFieldTitle', {
                  defaultMessage: 'Set length limit',
                })}
              </h3>
            }
            description={i18n.translate(
              'xpack.idxMgmt.mappingsEditor.leafLengthLimitFieldDescription',
              {
                defaultMessage:
                  'Prevent leaf values from being indexed if they are beyond a certain length. This is useful for protecting against Lucene’s term character-length limit of 8,191 UTF-8 characters.',
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
              'xpack.idxMgmt.mappingsEditor.splitQueriesOnWhitespaceDescription',
              {
                defaultMessage:
                  'Whether full text queries should split the input on whitespace when building a query for this field.',
              }
            )}
            formFieldPath="split_queries_on_whitespace"
          />

          <SimilarityParameter
            defaultToggleValue={getDefaultValueToggle('similarity', field.source)}
          />

          <DocValuesParameter />

          <NullValueParameter
            defaultToggleValue={getDefaultValueToggle('null_value', field.source)}
          />

          <BoostParameter defaultToggleValue={getDefaultValueToggle('boost', field.source)} />
        </EditFieldSection>
      </AdvancedSettingsWrapper>
    </>
  );
});
