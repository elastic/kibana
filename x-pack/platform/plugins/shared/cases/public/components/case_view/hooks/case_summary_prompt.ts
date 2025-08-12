/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CaseUI } from '../../../../common';

export function buildCaseSummaryPrompt(caseData: CaseUI, markdown?: boolean): string {
  const {
    title,
    description,
    tags = [],
    severity,
    category,
    assignees = [],
    status,
    createdAt,
    updatedAt,
    totalAlerts = 0,
    totalComment = 0,
    comments = [],
  } = caseData;

  // Format dates
  const createdDate = createdAt ? new Date(createdAt).toLocaleString() : 'N/A';
  const updatedDate = updatedAt ? new Date(updatedAt).toLocaleString() : 'N/A';

  // Extract alert types from comments if available
  const alertTypes = new Set<string>();
  const alertRules = new Set<string>();
  const userComments = new Set<string>();

  comments.forEach((comment) => {
    if (comment.type === 'alert' && comment.rule) {
      if (comment.rule.name) alertRules.add(comment.rule.name);
      if (comment.alertId?.length) {
        alertTypes.add(comment.rule.name || 'Unknown Alert');
      }
    }
    if (comment.type === 'user' && comment.comment) {
      userComments.add(comment.comment);
    }
  });

  let prompt = `You are an expert Site Reliability Engineering (SRE) assistant specialized in incident investigation and observability data analysis.
Create a ${
    markdown ? 'markdown' : ''
  } structured summary of the following case for a senior SRE. Focus on investigation-relevant details and avoid referring to specific users.\n\n`;

  // Basic case information
  prompt += `## Case Overview\n`;
  prompt += `- **Title**: ${title}\n`;
  prompt += `- **Status**: ${status || 'N/A'}\n`;
  prompt += `- **Severity**: ${severity || 'N/A'}\n`;
  if (category) prompt += `- **Category**: ${category}\n`;
  if (tags.length) prompt += `- **Tags**: ${tags.join(', ')}\n`;
  if (assignees.length) {
    prompt += `- **Assigned to**: ${assignees.length} ${
      assignees.length === 1 ? 'person' : 'people'
    }\n`;
  }
  prompt += `- **Created**: ${createdDate}\n`;
  prompt += `- **Last Updated**: ${updatedDate}\n\n`;

  // Description
  if (description) {
    prompt += `## Description\n${description}\n\n`;
  }

  // Alerts and activity
  prompt += `## Activity Summary\n`;
  prompt += `- **Total Alerts**: ${totalAlerts}\n`;
  if (alertTypes.size > 0) {
    prompt += `- **Alert Types**: ${Array.from(alertTypes).join(', ')}\n`;
  }
  if (alertRules.size > 0) {
    prompt += `- **Alert Rules**: ${Array.from(alertRules).join(', ')}\n`;
  }
  prompt += `- **Comments/Updates**: ${totalComment}\n\n`;
  prompt += `### User Comments\n`;
  if (userComments.size > 0) {
    prompt += Array.from(userComments).join('\n');
  }

  // Analysis instructions
  prompt += `## Analysis Instructions\n`;
  prompt += `Provide a concise 3-4 sentence summary that includes:\n`;
  prompt += `1. The core issue or incident being reported\n`;
  prompt += `2. The potential impact or severity level\n`;
  prompt += `3. Any relevant patterns or related alerts\n`;
  prompt += `4. Suggested next steps or areas for investigation\n\n`;
  prompt += `Focus on technical details and avoid mentioning specific users.\n\n`;
  prompt += `Do not start summary with saying markdown.`;

  return prompt;
}
