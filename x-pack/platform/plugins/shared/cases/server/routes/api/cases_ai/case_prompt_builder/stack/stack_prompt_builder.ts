/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CasePromptBuilder } from '../prompt_builder';

export class StackPromptBuilder extends CasePromptBuilder {
  protected getOpeningInstructions() {
    return `Summarize this case.`;
  }

  protected override getCaseDetails(): string {
    return this.getCaseMetadata();
  }

  protected getAnalysisInstructions(): string {
    return '';
  }
}
