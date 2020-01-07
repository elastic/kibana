/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { isEmpty } from 'lodash';
import { ErrorRaw } from '../../../../../../../typings/es_schemas/raw/ErrorRaw';
import {
  IWaterfallItem,
  IWaterfallError,
  IServiceColors
} from '../Waterfall/waterfall_helpers/waterfall_helpers';
import { Mark } from '.';

export interface ErrorMark extends Mark {
  type: 'errorMark';
  error: ErrorRaw;
  serviceColor?: string;
}

export const getErrorMarks = (
  items: IWaterfallItem[],
  serviceColors: IServiceColors
): ErrorMark[] => {
  if (isEmpty(items)) {
    return [];
  }

  return (items.filter(
    item => item.docType === 'error'
  ) as IWaterfallError[]).map(error => ({
    type: 'errorMark',
    offset: error.offset + error.skew,
    verticalLine: false,
    id: error.doc.error.id,
    error: error.doc,
    serviceColor: serviceColors[error.doc.service.name]
  }));
};
