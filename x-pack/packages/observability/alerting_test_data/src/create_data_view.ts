/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import { HEADERS, KIBANA_DEFAULT_URL, PASSWORD, USERNAME } from './constants';

const DATA_VIEW_CREATION_API = `${KIBANA_DEFAULT_URL}/api/content_management/rpc/create`;

export const createDataView = async ({
  indexPattern,
  id,
}: {
  indexPattern: string;
  id: string;
}) => {
  const dataViewParams = {
    contentTypeId: 'index-pattern',
    data: {
      fieldAttrs: '{}',
      title: indexPattern,
      timeFieldName: '@timestamp',
      sourceFilters: '[]',
      fields: '[]',
      fieldFormatMap: '{}',
      typeMeta: '{}',
      runtimeFieldMap: '{}',
      name: indexPattern,
    },
    options: { id },
    version: 1,
  };

  return axios.post(DATA_VIEW_CREATION_API, dataViewParams, {
    headers: HEADERS,
    auth: {
      username: USERNAME,
      password: PASSWORD,
    },
  });
};
