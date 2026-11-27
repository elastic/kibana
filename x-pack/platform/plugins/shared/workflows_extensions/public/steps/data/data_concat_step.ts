/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { dataConcatStepCommonDefinition } from '../../../common/steps/data';
import { createPublicStepDefinition } from '../../step_registry/types';

export const dataConcatStepDefinition = createPublicStepDefinition({
  ...dataConcatStepCommonDefinition,
  icon: React.lazy(() => import('./concat_icon').then((m) => ({ default: m.ConcatIcon }))),
});
