/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createPublicStepDefinition } from '@kbn/workflows-extensions/public';
import { checkDecidePrivilegesStepCommonDefinition } from '../../../common/proposals/step_types/check_decide_privileges_step';

export const checkDecidePrivilegesPublicStepDefinition = createPublicStepDefinition({
  ...checkDecidePrivilegesStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/lock').then(({ icon }) => ({
      default: icon,
    }))
  ),
});
