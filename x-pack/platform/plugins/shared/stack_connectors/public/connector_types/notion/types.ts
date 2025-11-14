/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  NotionSearchActionParams,
  NotionGetDataSourceActionParams,
} from '../../../common/notion/types';
import type { SUB_ACTION } from '../../../common/notion/constants';

export type NotionActionParams =
  | {
  subAction: SUB_ACTION.SEARCH;
  subActionParams: NotionSearchActionParams;
}
  | {
  subAction: SUB_ACTION.GET_DATA_SOURCE;
  subActionParams: NotionGetDataSourceActionParams;
};
