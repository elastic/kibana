/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { z } from '@kbn/zod/v4';
import {
  createPublicStepDefinition,
  type PublicStepDefinition,
} from '@kbn/workflows-extensions/public';

// createPublicStepDefinition(
//   definition: PublicStepDefinition<Input, Output, Config>
// ): PublicStepDefinition<Input, Output, Config>

export function createPublicCaseStepDefinition<
  Input extends z.ZodType = z.ZodType,
  Output extends z.ZodType = z.ZodType,
  Config extends z.ZodObject = z.ZodObject
>(definition: PublicStepDefinition<Input, Output, Config>) {
  return createPublicStepDefinition({
    icon: React.lazy(() =>
      import('@elastic/eui/es/components/icon/assets/briefcase').then(({ icon }) => ({
        default: icon,
      }))
    ),
    ...definition,
  });
}
