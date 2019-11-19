/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { i18n } from '@kbn/i18n';

import { NormalizedField, Field as FieldType } from '../../../../types';
import { getFieldConfig } from '../../../../lib';
import { UseField, Field } from '../../../../shared_imports';

import {
  StoreParameter,
  IndexParameter,
  DocValuesParameter,
  BoostParameter,
} from '../../field_parameters';
import { EditFieldSection, EditFieldFormRow, AdvancedSettingsWrapper } from '../edit_field';

const getDefaultValueToggle = (param: string, field: FieldType) => {
  switch (param) {
    case 'boost': {
      return field[param] !== undefined && field[param] !== getFieldConfig(param).defaultValue;
    }
    case 'null_value': {
      return field.null_value !== undefined && field.null_value !== '';
    }
    default:
      return false;
  }
};

interface Props {
  field: NormalizedField;
}

export const TokenCountType = ({ field }: Props) => {
  return (
    <>
      <EditFieldSection>
        <StoreParameter />
        <IndexParameter hasIndexOptions={false} />
        <DocValuesParameter />
      </EditFieldSection>

      <AdvancedSettingsWrapper>
        <EditFieldSection>
          {/* boost */}
          <BoostParameter defaultToggleValue={getDefaultValueToggle('boost', field.source)} />

          {/* null_value */}
          <EditFieldFormRow
            title={
              <h3>
                {i18n.translate('xpack.idxMgmt.mappingsEditor.tokenCountNullValueFieldTitle', {
                  defaultMessage: 'Set null value',
                })}
              </h3>
            }
            description={i18n.translate(
              'xpack.idxMgmt.mappingsEditor.tokenCountNullValueFieldDescription',
              {
                defaultMessage: 'Accepts a numeric value of the same type as the field.',
              }
            )}
            formFieldPath="null_value"
          >
            <UseField path="null_value" config={getFieldConfig('null_value')} component={Field} />
          </EditFieldFormRow>

          {/* enable_position_increments */}
          <EditFieldFormRow
            title={
              <h3>
                {i18n.translate('xpack.idxMgmt.mappingsEditor.enablePositionIncrementsFieldTitle', {
                  defaultMessage: 'Enable position increments',
                })}
              </h3>
            }
            description={i18n.translate(
              'xpack.idxMgmt.mappingsEditor.enablePositionIncrementsFieldDescription',
              {
                defaultMessage: 'Whether to count position increments.',
              }
            )}
            formFieldPath="enable_position_increments"
          />
        </EditFieldSection>
      </AdvancedSettingsWrapper>
    </>
  );
};
