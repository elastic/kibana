/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createPublicStepDefinition } from '@kbn/workflows-extensions/public';
import { createCaseStepCommonDefinition } from '../../common/workflows/steps/create_case';
import { connectorTypesOptions } from './case_enum_options';

export const createCaseStepDefinition = createPublicStepDefinition({
  ...createCaseStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/plus_circle').then(({ icon }) => ({
      default: icon,
    }))
  ),
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
