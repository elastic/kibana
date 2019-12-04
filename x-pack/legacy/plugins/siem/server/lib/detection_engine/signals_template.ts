/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import signalsMapping from './signals_mapping.json';

export const getSignalsTemplate = (index: string): unknown => {
  const template = {
    settings: {
      index: {
        lifecycle: {
          name: index,
          rollover_alias: index,
        },
      },
    },
    index_patterns: [`${index}-*`],
    mappings: signalsMapping.mappings,
  };
  return template;
};
