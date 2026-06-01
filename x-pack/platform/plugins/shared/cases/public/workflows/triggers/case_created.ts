/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PublicTriggerDefinition } from '@kbn/workflows-extensions/public';
import { caseCreatedTriggerCommonDefinition } from '../../../common/workflows/triggers';

export const caseCreatedTriggerPublicDefinition: PublicTriggerDefinition = {
  ...caseCreatedTriggerCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/app_cases').then(({ icon }) => ({
      default: icon,
    }))
  ),
};
