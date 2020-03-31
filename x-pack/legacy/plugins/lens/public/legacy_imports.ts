/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npSetup } from 'ui/new_platform';
export const { visualizations } = npSetup.plugins;
export { VisualizationsSetup } from '../../../../../src/plugins/visualizations/public';
export { DashboardConstants } from '../../../../../src/legacy/core_plugins/kibana/public/dashboard';
