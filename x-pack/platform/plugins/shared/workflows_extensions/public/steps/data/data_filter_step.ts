/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { dataFilterStepCommonDefinition } from '../../../common/steps/data';
import { createPublicStepDefinition } from '../../step_registry/types';

export const dataFilterStepDefinition = createPublicStepDefinition({
  ...dataFilterStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/inspect').then(({ icon }) => ({
      default: icon,
    }))
  ),
});
