/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { ML_BREADCRUMB, DATA_VISUALIZER_BREADCRUMB } from '../breadcrumbs';

export function getDataVisualizerBreadcrumbs() {
  // Whilst top level nav menu with tabs remains,
  // use root ML breadcrumb.
  return [ML_BREADCRUMB, DATA_VISUALIZER_BREADCRUMB];
}
