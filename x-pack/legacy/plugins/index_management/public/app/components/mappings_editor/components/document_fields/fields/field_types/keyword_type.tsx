/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { i18n } from '@kbn/i18n';

import { documentationService } from '../../../../../../services/documentation';
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
  SplitQueriesOnWhitespaceParameter,
} from '../../field_parameters';
import { EditFieldSection, EditFieldFormRow, AdvancedSettingsWrapper } from '../edit_field';

const getDefaultToggleValue = (param: string, field: FieldType) => {
  switch (param) {
    case 'boost':
    case 'similarity':
    case 'ignore_above': {
      return field[param] !== undefined && field[param] !== getFieldConfig(param).defaultValue;
    }
    case 'normalizer':
    case 'copy_to':
    case 'null_value': {
      return field.null_value !== undefined;
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
          title={i18n.translate('xpack.idxMgmt.mappingsEditor.normalizerFieldTitle', {
            defaultMessage: 'Use normalizer',
          })}
          description={i18n.translate('xpack.idxMgmt.mappingsEditor.normalizerFieldDescription', {
            defaultMessage: 'Process the keyword prior to indexing. ',
          })}
          defaultToggleValue={getDefaultToggleValue('normalizer', field.source)}
        >
          {isOn =>
            isOn === true && (
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
            title={i18n.translate('xpack.idxMgmt.mappingsEditor.lengthLimitFieldTitle', {
              defaultMessage: 'Set length limit',
            })}
            description={i18n.translate(
              'xpack.idxMgmt.mappingsEditor.lengthLimitFieldDescription',
              {
                defaultMessage:
                  'Strings longer than this value will not be indexed. This is useful for protecting against Lucene’s term character-length limit of 8,191 UTF-8 characters.',
              }
            )}
            defaultToggleValue={getDefaultToggleValue('ignore_above', field.source)}
          >
            <UseField
              path="ignore_above"
              config={getFieldConfig('ignore_above')}
              component={Field}
            />
          </EditFieldFormRow>

          <NormsParameter configPath="norms_keyword" />
        </EditFieldSection>

        <EditFieldSection>
          <SimilarityParameter
            defaultToggleValue={getDefaultToggleValue('similarity', field.source)}
          />

          <SplitQueriesOnWhitespaceParameter />

          <DocValuesParameter />

          <CopyToParameter defaultToggleValue={getDefaultToggleValue('copy_to', field.source)} />

          <NullValueParameter
            defaultToggleValue={getDefaultToggleValue('null_value', field.source)}
          />

          <StoreParameter />

          <BoostParameter defaultToggleValue={getDefaultToggleValue('boost', field.source)} />
        </EditFieldSection>
      </AdvancedSettingsWrapper>
    </>
  );
};
