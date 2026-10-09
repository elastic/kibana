/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Resolve in `beforeAll` to keep test bodies free of deployment conditionals.
export const forDeployment = <T>(
  config: { serverless: boolean },
  values: { stateful: T; serverless: T }
): T => (config.serverless ? values.serverless : values.stateful);
