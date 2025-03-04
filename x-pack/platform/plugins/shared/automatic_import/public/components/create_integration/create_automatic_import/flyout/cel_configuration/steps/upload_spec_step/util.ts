/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type Oas from 'oas';
import type { ApiPathOptions } from '../../../../types';

export const getApiPathsWithDescriptions = (apiSpec: Oas | undefined): ApiPathOptions => {
  const pathMap: { [key: string]: string } = {};
  const pathObjs = apiSpec?.getPaths();
  if (pathObjs) {
    for (const [path, pathObj] of Object.entries(pathObjs)) {
      if (pathObj?.get) {
        pathMap[path] = pathObj?.get?.getDescription() || pathObj?.get?.getSummary();
      }
    }
  }
  return pathMap;
};
