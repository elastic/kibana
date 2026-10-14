/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { infrastructureAttributesRoute } from './infrastructure_attributes';

export const infrastructureRouteDefinitions = {
  infrastructureAttributes: infrastructureAttributesRoute,
};

export type { InfrastructureAttributesResponse } from './infrastructure_attributes';
