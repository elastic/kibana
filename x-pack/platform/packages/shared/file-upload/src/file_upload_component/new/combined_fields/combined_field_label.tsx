/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';

import { ES_FIELD_TYPES } from '@kbn/field-types';
import type { CombinedField } from './types';

export function CombinedFieldLabel({ combinedField }: { combinedField: CombinedField }) {
  return <EuiText size="s">{getCombinedFieldLabel(combinedField)}</EuiText>;
}

function getCombinedFieldLabel(combinedField: CombinedField) {
  if (combinedField.mappingType === ES_FIELD_TYPES.GEO_POINT) {
    return `${combinedField.fieldNames.join(combinedField.delimiter)} => ${
      combinedField.combinedFieldName
    } (${combinedField.mappingType})`;
  }

  return combinedField.combinedFieldName;
}
