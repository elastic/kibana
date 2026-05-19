/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceIdentifier } from 'inversify';

/**
 * Request-scoped space id for the current request (from Spaces).
 * Used by RulesClient, and can be overridden to bind a the RulesClient to an explicit space.
 */
export const RulesClientSpaceIdToken = Symbol.for(
  'alerting_v2.RulesClient.SpaceId'
) as ServiceIdentifier<string>;
