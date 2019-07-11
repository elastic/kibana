/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AnomaliesNetworkTableProps } from '../types';

export const networkEquality = (
  prevProps: AnomaliesNetworkTableProps,
  nextProps: AnomaliesNetworkTableProps
): boolean =>
  prevProps.startDate === nextProps.startDate &&
  prevProps.endDate === nextProps.endDate &&
  prevProps.skip === nextProps.skip &&
  prevProps.flowTarget === nextProps.flowTarget;
