/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPublicStepDefinition } from '@kbn/workflows-extensions/public';
import { deleteCasesStepCommonDefinition } from '../../common/workflows/steps/delete_cases';

export const deleteCasesStepDefinition = createPublicStepDefinition({
  ...deleteCasesStepCommonDefinition,
});
