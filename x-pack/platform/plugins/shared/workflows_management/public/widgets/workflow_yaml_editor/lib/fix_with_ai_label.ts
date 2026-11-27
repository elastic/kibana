/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/**
 * Shared by the validation error row button, the Monaco quick fix, and the styles that
 * target the quick fix row by its label.
 */
export const FIX_WITH_AI_LABEL = i18n.translate(
  'workflows.workflowYAMLEditor.fixWithAiCodeAction',
  {
    defaultMessage: 'Fix with AI Agent',
  }
);
