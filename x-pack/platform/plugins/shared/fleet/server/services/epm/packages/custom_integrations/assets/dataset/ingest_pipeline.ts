/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dump } from 'js-yaml';

// NOTE: The install methods will take care of adding a reference to a @custom pipeline. We don't need to add one here.
export const createDefaultPipeline = (dataset: string, type: string) => {
  const pipeline = {
    processors: [
      {
        set: {
          description: "If '@timestamp' is missing, set it with the ingest timestamp",
          field: '@timestamp',
          override: false,
          copy_from: '_ingest.timestamp',
        },
      },
    ],
    _meta: {
      description: `default pipeline for the ${dataset} dataset`,
      managed: true,
    },
  };
  return dump(pipeline);
};
