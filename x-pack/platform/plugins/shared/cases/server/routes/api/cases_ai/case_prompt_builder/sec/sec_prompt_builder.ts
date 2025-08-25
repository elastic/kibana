/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CasePromptBuilder } from '../prompt_builder';

export class SecurityPromptBuilder extends CasePromptBuilder {
  protected getOpeningInstructions() {
    return `Create a structured summary of this case.\n\n`;
  }

  protected getAnalysisInstructions(): string {
    return '';
  }
}
