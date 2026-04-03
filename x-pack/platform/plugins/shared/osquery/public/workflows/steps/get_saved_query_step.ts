/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon } from '@elastic/eui';
import { createPublicStepDefinition } from '@kbn/workflows-extensions/public';
import { getSavedQueryStepCommonDefinition } from '../../../common/workflows/steps/get_saved_query_step';
import { createSavedQuerySelectionHandler } from '../saved_query_selection';

const OsqueryIcon: React.FC = () => React.createElement(EuiIcon, { type: 'logoOsquery' });

export const getSavedQueryStepPublicDefinition = createPublicStepDefinition({
  ...getSavedQueryStepCommonDefinition,
  icon: OsqueryIcon,
  editorHandlers: {
    input: {
      saved_query_id: {
        selection: createSavedQuerySelectionHandler(),
      },
    },
  },
});
