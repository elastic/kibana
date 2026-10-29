/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createToken } from '@kbn/core-di';
import type { ActionsClient } from '@kbn/actions-plugin/server';

/**
 * Actions client scoped to the current request
 */
export const ActionsClientToken = createToken<ActionsClient>('alerting_v2.ActionsClient');

/**
 * `server.publicBaseUrl`, when it is configured
 */
export const PublicBaseUrlToken = createToken<string | undefined>('alerting_v2.PublicBaseUrl');
