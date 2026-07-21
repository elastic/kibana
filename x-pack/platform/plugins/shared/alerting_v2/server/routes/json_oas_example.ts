/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Builds an OpenAPI media-type object with a single named JSON example.
 * Shared by Alerting v2 route `oasOperationObject` helpers.
 */
export const jsonExample = <T>(name: string, summary: string, value: T) => ({
  content: {
    'application/json': {
      examples: {
        [name]: {
          summary,
          value,
        },
      },
    },
  },
});
