/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { scriptsJavaScriptStepCommonDefinition } from '../../../common/steps/javascript';
import { createPublicStepDefinition } from '../../step_registry/types';

export const scriptsJavaScriptStepDefinition = createPublicStepDefinition({
  ...scriptsJavaScriptStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/code').then(({ icon }) => ({
      default: icon,
    }))
  ),
});
