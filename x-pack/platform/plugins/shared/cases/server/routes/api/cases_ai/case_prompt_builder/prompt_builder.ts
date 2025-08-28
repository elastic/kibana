/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Case } from '../../../../../common';

export abstract class CasePromptBuilder {
  constructor(protected caseData: Case) {}

  protected abstract getOpeningInstructions(): string;

  protected getCaseMetadata(): string {
    const {
      title,
      description,
      tags = [],
      severity,
      category,
      assignees = [],
      status,
      created_at: createdAt,
      updated_at: updatedAt,
    } = this.caseData;

    const createdDate = new Date(createdAt).toLocaleString();
    const updatedDate = updatedAt ? new Date(updatedAt).toLocaleString() : 'N/A';

    let caseOverview = `## Case Overview\n
  - **Title**: ${title}\n
  - **Status**: ${status || 'N/A'}\n
  - **Severity**: ${severity || 'N/A'}\n
  - **Created**: ${createdDate}\n
  - **Last Updated**: ${updatedDate}\n`;

    if (category) caseOverview += `- **Category**: ${category}\n`;
    if (tags.length > 0) caseOverview += `- **Tags**: ${tags.join(', ')}\n`;

    if (assignees.length > 0) {
      caseOverview += `- **Assigned to**: ${assignees.length} ${
        assignees.length === 1 ? 'person' : 'people'
      }\n\n`;
    }

    if (description) {
      caseOverview += `## Description\n${description}`;
    }

    return caseOverview;
  }

  protected getCaseDetails(): string {
    return '';
  }

  protected abstract getAnalysisInstructions(): string;

  buildSummary(): string {
    return [this.getOpeningInstructions(), this.getCaseDetails(), this.getAnalysisInstructions()]
      .filter((prompt) => prompt.trim() !== '')
      .join('\n\n');
  }
}
