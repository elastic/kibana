/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { events } from './events';
import { statuses } from './statuses';
import { defaultSettings } from './default_settings';

export const constants = {
  ...events,
  ...statuses,
  ...defaultSettings
};
