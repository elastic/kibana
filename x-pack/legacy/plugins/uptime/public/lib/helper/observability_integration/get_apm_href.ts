/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { addBasePath } from './add_base_path';
import { MonitorSummary } from '../../../../common/graphql/types';

export const getApmHref = (
  summary: MonitorSummary,
  basePath: string,
  dateRangeStart: string,
  dateRangeEnd: string
) =>
  addBasePath(
    basePath,
    `/app/apm#/services?kuery=${encodeURI(
      `url.domain: "${get(summary, 'state.url.domain')}"`
    )}&rangeFrom=${dateRangeStart}&rangeTo=${dateRangeEnd}`
  );
