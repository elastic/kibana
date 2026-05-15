/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * YAML definition for the default PII anonymization workflow that runs before
 * each LLM prompt. Import this string via the Workflow Management UI or use it
 * in integration tests to seed the workflow registry.
 */
export const beforePromptAnonymizationWorkflow: string = readFileSync(
  join(__dirname, 'src', 'before_prompt_anonymization.yaml'),
  'utf-8'
);

/**
 * YAML definition for the default PII deanonymization workflow that runs after
 * each LLM completion. Import this string via the Workflow Management UI or use
 * it in integration tests to seed the workflow registry.
 */
export const afterCompletionDeanonymizationWorkflow: string = readFileSync(
  join(__dirname, 'src', 'after_completion_deanonymization.yaml'),
  'utf-8'
);
