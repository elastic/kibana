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
        {/* depth_limit */}
        <EditFieldFormRow
          title={
            <h3>
              {i18n.translate('xpack.idxMgmt.mappingsEditor.depthLimitTitle', {
                defaultMessage: 'Set depth limit',
              })}
            </h3>
          }
          description={i18n.translate('xpack.idxMgmt.mappingsEditor.depthLimitDescription', {
            defaultMessage:
              'The maximum allowed depth of the flattened object field, in terms of nested inner objects.',
          })}
        >
          <UseField path="depth_limit" config={getFieldConfig('depth_limit')} component={Field} />
        </EditFieldFormRow>

        {/* index */}
        <IndexParameter />

        {/* doc_values */}
        <DocValuesParameter />
      </EditFieldSection>

      <AdvancedSettingsWrapper>
        <EditFieldSection>
          {/* boost */}
          <BoostParameter defaultToggleValue={getDefaultValueToggle('boost', field.source)} />

          {/* eager_global_ordinals */}
          <EagerGlobalOrdinalsParameter />

          {/* ignore_above */}
          <EditFieldFormRow
            title={
              <h3>
                {i18n.translate('xpack.idxMgmt.mappingsEditor.leafLengthLimitFieldTitle', {
                  defaultMessage: 'Set leaf value length limit',
                })}
              </h3>
            }
            description={i18n.translate(
              'xpack.idxMgmt.mappingsEditor.leafLengthLimitFieldDescription',
              {
                defaultMessage: 'Leaf values longer than this limit will not be indexed.',
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
        </EditFieldSection>

        <EditFieldSection>
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
          {/* similarity */}
          <SimilarityParameter
            defaultToggleValue={getDefaultValueToggle('similarity', field.source)}
          />

          {/* null_value */}
          <NullValueParameter
            defaultToggleValue={getDefaultValueToggle('null_value', field.source)}
          />
        </EditFieldSection>
      </AdvancedSettingsWrapper>
    </>
  );
});
