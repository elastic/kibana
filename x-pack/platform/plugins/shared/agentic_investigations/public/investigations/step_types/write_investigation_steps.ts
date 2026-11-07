/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createPublicStepDefinition } from '@kbn/workflows-extensions/public';
import {
  createInvestigationStepCommonDefinition,
  patchInvestigationStepCommonDefinition,
  setHypothesesStepCommonDefinition,
} from '../../../common/investigations/step_types/write_investigation_steps';

const lazyIcon = (load: () => Promise<{ icon: React.ComponentType }>) =>
  React.lazy(() => load().then(({ icon }) => ({ default: icon })));

export const createInvestigationPublicStepDefinition = createPublicStepDefinition({
  ...createInvestigationStepCommonDefinition,
  icon: lazyIcon(() => import('@elastic/eui/es/components/icon/assets/plus_circle')),
});

export const patchInvestigationPublicStepDefinition = createPublicStepDefinition({
  ...patchInvestigationStepCommonDefinition,
  icon: lazyIcon(() => import('@elastic/eui/es/components/icon/assets/pencil')),
});

export const setHypothesesPublicStepDefinition = createPublicStepDefinition({
  ...setHypothesesStepCommonDefinition,
  icon: lazyIcon(() => import('@elastic/eui/es/components/icon/assets/list_bullet')),
});
