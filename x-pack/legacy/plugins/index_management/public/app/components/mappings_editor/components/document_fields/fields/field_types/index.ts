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
import { IpType } from './ip_type';
import { TokenCountType } from './token_count_type';
import { CompletionType } from './completion_type';
import { GeoPointType } from './geo_point_type';
import { DateType } from './date_type';
import { GeoShapeType } from './geo_shape_type';
import { SearchAsYouType } from './search_as_you_type';
import { FlattenedType } from './flattened_type';
import { ShapeType } from './shape_type';
import { DenseVectorType } from './dense_vector_type';

const typeToParametersFormMap: { [key in DataType]?: ComponentType<any> } = {
  alias: AliasType,
  keyword: KeywordType,
  numeric: NumericType,
  text: TextType,
  boolean: BooleanType,
  binary: BinaryType,
  range: RangeType,
  ip: IpType,
  token_count: TokenCountType,
  completion: CompletionType,
  geo_point: GeoPointType,
  date: DateType,
  date_nanos: DateType,
  geo_shape: GeoShapeType,
  search_as_you_type: SearchAsYouType,
  flattened: FlattenedType,
  shape: ShapeType,
  dense_vector: DenseVectorType,
};

export const getParametersFormForType = (
  type: MainType,
  subType?: SubType
):
  | ComponentType<{
      field: NormalizedField;
      allFields: NormalizedFields['byId'];
      isMultiField: boolean;
    }>
  | undefined =>
  subType === undefined
    ? typeToParametersFormMap[type]
    : typeToParametersFormMap[subType] || typeToParametersFormMap[type];
