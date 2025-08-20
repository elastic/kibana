/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Case } from '../../../../../../common';

export function buildBaseCaseSummaryPrompt(caseData: Case): string {
  let prompt = '';

  prompt += getOpeningInstructions();
  prompt += buildCaseOverview(caseData);

  return prompt;
}

function getOpeningInstructions() {
  return `You are an expert Site Reliability Engineering (SRE) specialized in incident investigation.
  Create a structured summary of the following case for your fellow Site Reliability Engineers.\n\n`;
}

function buildCaseOverview(caseData: Case) {
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
  } = caseData;

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
    caseOverview += `## Description\n${description}\n\n`;
  }

  return caseOverview;
}
