/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { i18n } from '@kbn/i18n';

import { NormalizedField, Field as FieldType } from '../../../../types';
import { getFieldConfig } from '../../../../lib';
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
    case 'ignore_malformed': {
      // we are inverting the underlying setting by setting the label to "Reject malformed"
      return field.ignore_malformed !== undefined ? !field.ignore_malformed : true;
    }
    default:
      return false;
  }
};

interface Props {
  field: NormalizedField;
}

export const BooleanType = ({ field }: Props) => {
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
                {i18n.translate('xpack.idxMgmt.mappingsEditor.booleanNullValueFieldTitle', {
                  defaultMessage: 'Set null value',
                })}
              </h3>
            }
            description={i18n.translate(
              'xpack.idxMgmt.mappingsEditor.booleanNullValueFieldDescription',
              {
                defaultMessage: 'Whether to substitute values for any explicit null values.',
              }
            )}
            formFieldPath="null_value"
          />
        </EditFieldSection>
      </AdvancedSettingsWrapper>
    </>
  );
};
