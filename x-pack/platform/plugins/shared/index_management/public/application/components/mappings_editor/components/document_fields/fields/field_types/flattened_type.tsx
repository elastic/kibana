/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import SemVer from 'semver/classes/semver';

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
  SplitQueriesOnWhitespaceParameter,
  MetaParameter,
  IgnoreAboveParameter,
} from '../../field_parameters';
import { BasicParametersSection, EditFieldFormRow, AdvancedParametersSection } from '../edit_field';

interface Props {
  field: NormalizedField;
  kibanaVersion: SemVer;
}

const getDefaultToggleValue = (param: string, field: FieldType) => {
  switch (param) {
    case 'boost':
    case 'ignore_above':
    case 'meta':
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

export const FlattenedType = React.memo(({ field, kibanaVersion }: Props) => {
  return (
    <>
      <BasicParametersSection>
        <IndexParameter
          config={getFieldConfig('index_options_flattened')}
          indexOptions={PARAMETERS_OPTIONS.index_options_flattened}
        />
      </BasicParametersSection>

      <AdvancedParametersSection>
        <EagerGlobalOrdinalsParameter />

        {/* depth_limit */}
        <EditFieldFormRow
          title={i18n.translate('xpack.idxMgmt.mappingsEditor.depthLimitTitle', {
            defaultMessage: 'Customize depth limit',
          })}
          description={i18n.translate('xpack.idxMgmt.mappingsEditor.depthLimitDescription', {
            defaultMessage:
              'The maximum allowed depth of the flattened object field, in terms of nested inner objects. Defaults to 20.',
          })}
        >
          <UseField path="depth_limit" config={getFieldConfig('depth_limit')} component={Field} />
        </EditFieldFormRow>

        <IgnoreAboveParameter
          defaultToggleValue={getDefaultToggleValue('ignore_above', field.source)}
        />

        <SplitQueriesOnWhitespaceParameter />

        <SimilarityParameter
          defaultToggleValue={getDefaultToggleValue('similarity', field.source)}
        />

        <DocValuesParameter />

        <NullValueParameter
          defaultToggleValue={getDefaultToggleValue('null_value', field.source)}
        />

        <MetaParameter defaultToggleValue={getDefaultToggleValue('meta', field.source)} />

        {/* The "boost" parameter is deprecated since 8.x */}
        {kibanaVersion.major < 8 && (
          <BoostParameter defaultToggleValue={getDefaultToggleValue('boost', field.source)} />
        )}
      </AdvancedParametersSection>
    </>
  );
});
