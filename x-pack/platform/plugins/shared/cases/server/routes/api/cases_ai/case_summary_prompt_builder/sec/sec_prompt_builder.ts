/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildBaseCaseSummaryPrompt } from '../base/base_prompt';
import { CasePromptBuilder } from '../prompt_builder';

export class SecurityPromptBuilder extends CasePromptBuilder {
  build(): string {
    const basePrompt = buildBaseCaseSummaryPrompt(this.caseData);
    const secPrompt = '';
    return `${basePrompt}${secPrompt}`;
  }
}
