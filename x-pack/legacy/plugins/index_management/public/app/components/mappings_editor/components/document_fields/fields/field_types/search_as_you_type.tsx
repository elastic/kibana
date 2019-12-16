/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { NormalizedField, Field as FieldType } from '../../../../types';
import { getFieldConfig } from '../../../../lib';
import {
  StoreParameter,
  IndexParameter,
  AnalyzersParameter,
  NormsParameter,
  SimilarityParameter,
  TermVectorParameter,
} from '../../field_parameters';
import { EditFieldSection, AdvancedSettingsWrapper } from '../edit_field';

interface Props {
  field: NormalizedField;
}

const getDefaultToggleValue = (param: string, field: FieldType) => {
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
        <IndexParameter
          config={{ ...getFieldConfig('index_options'), defaultValue: 'positions' }}
        />
      </EditFieldSection>

      <AdvancedSettingsWrapper>
        <AnalyzersParameter field={field} withSearchQuoteAnalyzer={true} />

        <EditFieldSection>
          <NormsParameter />

          <SimilarityParameter
            defaultToggleValue={getDefaultToggleValue('similarity', field.source)}
          />

          <TermVectorParameter
            field={field}
            defaultToggleValue={getDefaultToggleValue('term_vector', field.source)}
          />

          <StoreParameter />
        </EditFieldSection>
      </AdvancedSettingsWrapper>
    </>
  );
});
