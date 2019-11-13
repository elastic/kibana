/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ComponentType } from 'react';
import { MainType, SubType, DataType, NormalizedField } from '../../../../types';

import { TextType } from './text_type';
import { KeywordType } from './keyword_type';
import { NumericType } from './numeric_type';
import { BooleanType } from './boolean_type';
import { BinaryType } from './binary_type';
import { RangeType } from './range_type';

const typeMapToParametersForm: { [key in DataType]?: ComponentType<any> } = {
  text: TextType,
  keyword: KeywordType,
  numeric: NumericType,
  boolean: BooleanType,
  binary: BinaryType,
  range: RangeType,
};

export const getParametersFormForType = (
  type: MainType,
  subType?: SubType
): ComponentType<{ field: NormalizedField }> | undefined =>
  subType === undefined
    ? typeMapToParametersForm[type]
    : typeMapToParametersForm[subType] || typeMapToParametersForm[type];
