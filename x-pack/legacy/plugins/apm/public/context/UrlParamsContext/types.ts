/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LocalUIFilterName } from '../../../server/lib/ui_filters/local_ui_filters/config';

export type IUrlParams = {
  detailTab?: string;
  end?: string;
  errorGroupId?: string;
  flyoutDetailTab?: string;
  kuery?: string;
  environment?: string;
  rangeFrom?: string;
  rangeTo?: string;
  refreshInterval?: number;
  refreshPaused?: boolean;
  serviceName?: string;
  sortDirection?: string;
  sortField?: string;
  start?: string;
  traceId?: string;
  transactionId?: string;
  transactionName?: string;
  transactionType?: string;
  waterfallItemId?: string;
  page?: number;
  pageSize?: number;
} & Partial<Record<LocalUIFilterName, string>>;
