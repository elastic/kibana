/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState } from 'react';

import { IndexPattern } from 'ui/index_patterns';

import { dictionaryToArray } from '../../../../../../common/types/common';
import { ml } from '../../../../../services/ml_api_service';

import { Dictionary } from '../../../../../../common/types/common';
import { ES_FIELD_TYPES } from '../../../../../../../../../../src/plugins/data/public';
import {
  getPreviewRequestBody,
  PreviewRequestBody,
  PivotAggsConfigDict,
  PivotGroupByConfigDict,
  PivotQuery,
} from '../../../../common';

export enum PIVOT_PREVIEW_STATUS {
  UNUSED,
  LOADING,
  LOADED,
  ERROR,
}

interface EsMappingType {
  type: ES_FIELD_TYPES;
}

type DataFramePreviewData = Array<Dictionary<any>>;
interface DataFramePreviewMappings {
  properties: Dictionary<EsMappingType>;
}

export interface UsePivotPreviewDataReturnType {
  errorMessage: string;
  status: PIVOT_PREVIEW_STATUS;
  dataFramePreviewData: DataFramePreviewData;
  dataFramePreviewMappings: DataFramePreviewMappings;
  previewRequest: PreviewRequestBody;
}

export interface GetDataFrameTransformsResponse {
  preview: DataFramePreviewData;
  mappings: DataFramePreviewMappings;
}

export const usePivotPreviewData = (
  indexPattern: IndexPattern,
  query: PivotQuery,
  aggs: PivotAggsConfigDict,
  groupBy: PivotGroupByConfigDict
): UsePivotPreviewDataReturnType => {
  const [errorMessage, setErrorMessage] = useState('');
  const [status, setStatus] = useState(PIVOT_PREVIEW_STATUS.UNUSED);
  const [dataFramePreviewData, setDataFramePreviewData] = useState<DataFramePreviewData>([]);
  const [dataFramePreviewMappings, setDataFramePreviewMappings] = useState<
    DataFramePreviewMappings
  >({ properties: {} });

  const aggsArr = dictionaryToArray(aggs);
  const groupByArr = dictionaryToArray(groupBy);

  const previewRequest = getPreviewRequestBody(indexPattern.title, query, groupByArr, aggsArr);

  const getDataFramePreviewData = async () => {
    if (aggsArr.length === 0 || groupByArr.length === 0) {
      setDataFramePreviewData([]);
      return;
    }

    setErrorMessage('');
    setStatus(PIVOT_PREVIEW_STATUS.LOADING);

    try {
      const resp: GetDataFrameTransformsResponse = await ml.dataFrame.getDataFrameTransformsPreview(
        previewRequest
      );
      setDataFramePreviewData(resp.preview);
      setDataFramePreviewMappings(resp.mappings);
      setStatus(PIVOT_PREVIEW_STATUS.LOADED);
    } catch (e) {
      setErrorMessage(JSON.stringify(e));
      setDataFramePreviewData([]);
      setDataFramePreviewMappings({ properties: {} });
      setStatus(PIVOT_PREVIEW_STATUS.ERROR);
    }
  };

  useEffect(() => {
    getDataFramePreviewData();
  }, [
    indexPattern.title,
    JSON.stringify(aggsArr),
    JSON.stringify(groupByArr),
    JSON.stringify(query),
  ]);
  return { errorMessage, status, dataFramePreviewData, dataFramePreviewMappings, previewRequest };
};
