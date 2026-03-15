/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createPublicStepDefinition } from '@kbn/workflows-extensions/public';
import { findCasesStepCommonDefinition } from '../../common/workflows/steps/find_cases';

export const findCasesStepDefinition = createPublicStepDefinition({
  ...findCasesStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/magnify').then(({ icon }) => ({
      default: icon,
    }))
  ),
});
