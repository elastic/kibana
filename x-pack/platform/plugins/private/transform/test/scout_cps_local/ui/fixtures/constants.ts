/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MOCK_IDP_UIAM_PROJECT_ID, MOCK_IDP_UIAM_PROJECT_ID2 } from '@kbn/mock-idp-utils';

export const DATA_VIEW_ID = 'ft_farequote';
export const DATA_VIEW_TITLE = 'ft_farequote';
export const DATA_VIEW_TIME_FIELD = '@timestamp';

export const ORIGIN_PROJECT_ID = MOCK_IDP_UIAM_PROJECT_ID;
export const LINKED_PROJECT_ID = MOCK_IDP_UIAM_PROJECT_ID2;
export const PROJECT_IDS = [ORIGIN_PROJECT_ID, LINKED_PROJECT_ID];

export const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
};
