/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createToken } from '@kbn/core-di';

/**
 * Request-scoped space id for the current request (from Spaces).
 * Used by RulesClient, AlertActionsClient, and can be overridden to bind clients to an explicit space.
 */
export const RequestSpaceIdToken = createToken<string>('alerting_v2.SpacesService.RequestSpaceId');
