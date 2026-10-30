/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import { createPublicStepDefinition } from '@kbn/workflows-extensions/public';
import { runQueryStepCommonDefinition } from '../../common/workflows/step_types/run_query/run_query_common';
import { createSavedQuerySelection } from './selection/saved_query_selection';
import { OsqueryStepIcon } from './step_icon';

export const createRunQueryStepDefinition = (http: HttpSetup) =>
  createPublicStepDefinition({
    ...runQueryStepCommonDefinition,
    icon: OsqueryStepIcon,
    editorHandlers: {
      input: {
        saved_query: { selection: createSavedQuerySelection(http) },
      },
    },
  });
