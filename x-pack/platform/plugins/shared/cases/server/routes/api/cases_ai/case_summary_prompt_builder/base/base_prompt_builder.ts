/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CasePromptBuilder } from '../prompt_builder';
import { buildBaseCaseSummaryPrompt } from './base_prompt';

export class BasePromptBuilder extends CasePromptBuilder {
  build(): string {
    const basePrompt = buildBaseCaseSummaryPrompt(this.caseData);
    return basePrompt;
  }
}
