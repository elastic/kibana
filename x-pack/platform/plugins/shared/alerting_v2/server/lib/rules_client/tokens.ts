/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createToken } from '@kbn/core-di';
import type { CreateRulesClientOptions } from './types';

/** Options the calling plugin passed when it asked for a rules client. Defaults to none. */
export const RulesClientOptionsToken = createToken<CreateRulesClientOptions>(
  'alerting_v2.RulesClientOptions'
);
