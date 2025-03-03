/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SolutionView } from '../../../common';

const CLOUD_TO_KIBANA_SOLUTION_MAP = new Map<string, SolutionView>([
  ['search', 'es'],
  ['elasticsearch', 'es'],
  ['observability', 'oblt'],
  ['security', 'security'],
]);

/**
 * Cloud does not type the value of the "use case" that is set during onboarding for a deployment. Any string can
 * be passed. This function maps the known values to the Kibana values.
 *
 * @param value The solution value set by Cloud.
 * @returns The default solution value for onboarding that matches Kibana naming.
 */
export function parseCloudSolution(value?: string): SolutionView {
  const parsedValue = value ? CLOUD_TO_KIBANA_SOLUTION_MAP.get(value.toLowerCase()) : undefined;
  if (!parsedValue) {
    throw new Error(`${value} is not a valid solution value set by Cloud`);
  }

  return parsedValue;
}
