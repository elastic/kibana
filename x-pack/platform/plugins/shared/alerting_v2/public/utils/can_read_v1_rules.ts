/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Capabilities } from '@kbn/core/public';
import { TRIGGERS_ACTIONS_RULES_CAPABILITY_ID } from '@kbn/rule-data-utils';

/**
 * Returns whether the current user can read the v1 Rules page. Takes `Capabilities` rather than
 * `CoreStart` because this plugin resolves core services individually through dependency
 * injection and cannot produce a whole `CoreStart`.
 */
export const canReadV1Rules = (capabilities: Capabilities): boolean =>
  Boolean(capabilities.management?.insightsAndAlerting?.[TRIGGERS_ACTIONS_RULES_CAPABILITY_ID]);
