/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'query-string';
import type { Location } from 'history';

export const getIsLegacyFromQueryParams = (location: Location): boolean => {
  const { legacy } = parse(location.search.substring(1));

  if (!Boolean(legacy) || typeof legacy !== 'string') {
    return false;
  }

  return legacy === 'true';
};
