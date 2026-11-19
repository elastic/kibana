/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { dataMapStepCommonDefinition } from '../../../common/steps/data';
import { createPublicStepDefinition } from '../../step_registry/types';

export const dataMapStepDefinition = createPublicStepDefinition({
  ...dataMapStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/mapping').then(({ icon }) => ({
      default: icon,
    }))
  ),
});
