/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HostOrNetworkProps } from '../types';

export const dateTimesAreEqual = (
  prevProps: HostOrNetworkProps,
  nextProps: HostOrNetworkProps
): boolean =>
  prevProps.startDate === nextProps.startDate &&
  prevProps.endDate === nextProps.endDate &&
  prevProps.skip === nextProps.skip;
