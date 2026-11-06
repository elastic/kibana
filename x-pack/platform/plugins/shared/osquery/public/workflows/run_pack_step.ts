/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import { createPublicStepDefinition } from '@kbn/workflows-extensions/public';
import { runPackStepCommonDefinition } from '../../common/workflows/step_types/run_pack/run_pack_common';
import { OsqueryStepIcon } from './step_icon';

export const createRunPackStepDefinition = (_http: HttpSetup) =>
  createPublicStepDefinition({
    ...runPackStepCommonDefinition,
    icon: OsqueryStepIcon,
  });
