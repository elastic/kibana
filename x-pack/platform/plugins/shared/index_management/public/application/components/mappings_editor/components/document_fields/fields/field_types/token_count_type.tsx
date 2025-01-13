/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import SemVer from 'semver/classes/semver';
import { i18n } from '@kbn/i18n';

import { documentationService } from '../../../../../../services/documentation';
import { NormalizedField, Field as FieldType } from '../../../../types';
import { getFieldConfig } from '../../../../lib';
import { STANDARD } from '../../../../constants';
import { UseField, NumericField } from '../../../../shared_imports';

import {
  StoreParameter,
  IndexParameter,
  DocValuesParameter,
  BoostParameter,
  AnalyzerParameter,
  NullValueParameter,
  MetaParameter,
} from '../../field_parameters';
import { BasicParametersSection, EditFieldFormRow, AdvancedParametersSection } from '../edit_field';

const getDefaultToggleValue = (param: string, field: FieldType) => {
  switch (param) {
    case 'analyzer':
    case 'meta':
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
  kibanaVersion: SemVer;
}

export const TokenCountType = ({ field, kibanaVersion }: Props) => {
  return (
    <>
      <BasicParametersSection>
        <EditFieldFormRow
          title={i18n.translate('xpack.idxMgmt.mappingsEditor.tokenCount.analyzerSectionTitle', {
            defaultMessage: 'Analyzer',
          })}
          docLink={{
            text: i18n.translate('xpack.idxMgmt.mappingsEditor.tokenCount.analyzerLinkText', {
              defaultMessage: 'Analyzer documentation',
            }),
            href: documentationService.getAnalyzerLink(),
          }}
          withToggle={false}
        >
          <AnalyzerParameter
            path="analyzer"
            config={{ ...getFieldConfig('analyzer'), defaultValue: STANDARD }} // If "field.source.analyzer" is undefined, defaults to "standard" analyzer
            defaultValue={field.source.analyzer as string}
            allowsIndexDefaultOption={false}
          />
        </EditFieldFormRow>

        <IndexParameter hasIndexOptions={false} />
      </BasicParametersSection>

      <AdvancedParametersSection>
        {/* enable_position_increments */}
        <EditFieldFormRow
          title={i18n.translate(
            'xpack.idxMgmt.mappingsEditor.tokenCount.enablePositionIncrementsFieldTitle',
            {
              defaultMessage: 'Enable position increments',
            }
          )}
          description={i18n.translate(
            'xpack.idxMgmt.mappingsEditor.tokenCount.enablePositionIncrementsFieldDescription',
            {
              defaultMessage: 'Whether to count position increments.',
            }
          )}
          formFieldPath="enable_position_increments"
        />

        <DocValuesParameter />

        <NullValueParameter
          defaultToggleValue={getDefaultToggleValue('null_value', field.source)}
          description={i18n.translate(
            'xpack.idxMgmt.mappingsEditor.tokenCount.nullValueFieldDescription',
            {
              defaultMessage:
                'Accepts a numeric value of the same type as the field which is substituted for any explicit null values.',
            }
          )}
        >
          <UseField
            path="null_value"
            component={NumericField}
            config={getFieldConfig('null_value_numeric')}
          />
        </NullValueParameter>

        <StoreParameter />

        <MetaParameter defaultToggleValue={getDefaultToggleValue('meta', field.source)} />

        {/* The "boost" parameter is deprecated since 8.x */}
        {kibanaVersion.major < 8 && (
          <BoostParameter defaultToggleValue={getDefaultToggleValue('boost', field.source)} />
        )}
      </AdvancedParametersSection>
    </>
  );
};
