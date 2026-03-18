/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPublicStepDefinition } from '@kbn/workflows-extensions/public';
import { addCommentStepCommonDefinition } from '../../common/workflows/steps/add_comment';
// import { caseIdInputEditorHandlers } from './case_id_selection_handler';

export const addCommentStepDefinition = createPublicStepDefinition({
  ...addCommentStepCommonDefinition,
  // TODO: enable one case_id can be a template AND an inputHandler
  // editorHandlers: caseIdInputEditorHandlers,
});
