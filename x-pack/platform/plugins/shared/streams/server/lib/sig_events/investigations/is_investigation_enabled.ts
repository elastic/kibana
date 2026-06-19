/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient } from '@kbn/core/server';
import { OBSERVABILITY_STREAMS_ENABLE_INVESTIGATION } from '@kbn/management-settings-ids';

export const isInvestigationEnabled = async (uiSettingsClient: IUiSettingsClient) =>
  (await uiSettingsClient.get<boolean>(OBSERVABILITY_STREAMS_ENABLE_INVESTIGATION)) ?? false;
