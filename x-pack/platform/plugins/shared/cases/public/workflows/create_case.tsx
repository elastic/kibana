/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCaseStepCommonDefinition } from '../../common/workflows/steps/create_case';
import { connectorTypesOptions } from './case_enum_options';
import { createPublicCaseStepDefinition } from './shared';

export const createCaseStepDefinition = createPublicCaseStepDefinition({
  ...createCaseStepCommonDefinition,
  editorHandlers: {
    config: {
      'connector-id': {
        connectorIdSelection: {
          connectorTypes: connectorTypesOptions,
          enableCreation: false,
        },
      },
    },
  },
});
