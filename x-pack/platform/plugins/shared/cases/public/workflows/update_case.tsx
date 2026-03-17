/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createPublicStepDefinition } from '@kbn/workflows-extensions/public';
import { updateCaseStepCommonDefinition } from '../../common/workflows/steps/update_case';
// import { caseIdInputEditorHandlers } from './case_id_selection_handler';

export const updateCaseStepDefinition = createPublicStepDefinition({
  ...updateCaseStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/pencil').then(({ icon }) => ({
      default: icon,
    }))
  ),
  // TODO: enable one case_id can be a template AND an inputHandler
  // editorHandlers: caseIdInputEditorHandlers,
});
