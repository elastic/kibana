/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RulesSettingsQueryDelay } from '../../../../../common';
import { QueryDelaySettingsResponseV1 } from '../../../../../common/routes/rules_settings/response';

export const transformQueryDelaySettingsToResponse = (
  settings: RulesSettingsQueryDelay
): QueryDelaySettingsResponseV1 => {
  return {
    body: {
      delay: settings.delay,
      created_by: settings.createdBy,
      updated_by: settings.updatedBy,
      created_at: settings.createdAt,
      updated_at: settings.updatedAt,
    },
  };
};
