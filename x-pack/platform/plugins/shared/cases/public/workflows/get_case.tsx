/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createPublicStepDefinition } from '@kbn/workflows-extensions/public';
import { getCaseStepCommonDefinition } from '../../common/workflows/steps/get_case';
// import { caseIdInputEditorHandlers } from './case_id_selection_handler';

export const getCaseStepDefinition = createPublicStepDefinition({
  ...getCaseStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/magnify').then(({ icon }) => ({
      default: icon,
    }))
  ),
  // TODO: enable one case_id can be a template AND an inputHandler
  // editorHandlers: caseIdInputEditorHandlers,
});
