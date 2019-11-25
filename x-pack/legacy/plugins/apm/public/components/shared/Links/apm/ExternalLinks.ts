/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { generatePath } from '../../../app/Main/route_config/utils';
import { RouteName } from '../../../app/Main/route_config/route_names';

export const getTraceUrl = (traceId: number | string) =>
  generatePath(RouteName.LINK_TO_TRACE, { traceId });
