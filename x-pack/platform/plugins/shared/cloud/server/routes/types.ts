/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CustomRequestHandlerContext } from '@kbn/core/server';

/**
 * @internal
 */
export type CloudRequestHandlerContext = CustomRequestHandlerContext<{}>;

export interface CloudDataAttributes {
  onboardingData: {
    solutionType: 'security' | 'observability' | 'search' | 'elasticsearch';
    token: string;
  };
}
