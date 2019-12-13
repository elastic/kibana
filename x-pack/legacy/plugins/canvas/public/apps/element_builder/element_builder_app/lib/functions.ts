/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CanvasFunction } from '../../../../../types';
// @ts-ignore
import { functions } from '../../../../../canvas_plugin_src/functions/browser';
import { demodata } from '../../../../../canvas_plugin_src/functions/server/demodata';
import { pointseries } from '../../../../../canvas_plugin_src/functions/server/pointseries';

export const getFunctionDefinitions = (): CanvasFunction[] => {
  return [...functions.map(fn => fn()), demodata(), pointseries()];
};
