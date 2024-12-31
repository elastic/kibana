/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PLUGIN_ID } from '../../common';

export const FLEET_API_PRIVILEGES = {
  AGENTS: {
    READ: `${PLUGIN_ID}-agents-read`,
    ALL: `${PLUGIN_ID}-agents-read`,
  },
};
