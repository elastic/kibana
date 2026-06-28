/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_EPISODE_ACTION_TYPE } from '@kbn/alerting-v2-schemas';
import { createAuditOnlyHandler } from './audit_only_handler';

export const assignHandler = createAuditOnlyHandler(ALERT_EPISODE_ACTION_TYPE.ASSIGN);
