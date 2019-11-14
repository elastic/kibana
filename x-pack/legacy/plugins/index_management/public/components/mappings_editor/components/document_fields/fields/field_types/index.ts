/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ComponentType } from 'react';
import { MainType, SubType, DataType, NormalizedField, NormalizedFields } from '../../../../types';

import { AliasType } from './alias_type';
import { KeywordType } from './keyword_type';
import { NumericType } from './numeric_type';
import { TextType } from './text_type';
import { BooleanType } from './boolean_type';
import { BinaryType } from './binary_type';
import { RangeType } from './range_type';

const typeToParametersFormMap: { [key in DataType]?: ComponentType<any> } = {
  alias: AliasType,
  keyword: KeywordType,
  numeric: NumericType,
  text: TextType,
  boolean: BooleanType,
  binary: BinaryType,
  range: RangeType,
};

export const getParametersFormForType = (
  type: MainType,
  subType?: SubType
): ComponentType<{ field: NormalizedField; allFields: NormalizedFields['byId'] }> | undefined =>
  subType === undefined
    ? typeToParametersFormMap[type]
    : typeToParametersFormMap[subType] || typeToParametersFormMap[type];
