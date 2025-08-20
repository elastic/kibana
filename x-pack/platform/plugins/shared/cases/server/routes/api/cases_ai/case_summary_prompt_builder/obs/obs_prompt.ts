/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Case } from '../../../../../../common';
import type { Attachments } from '../../../../../../common/types/domain';
import { AttachmentType } from '../../../../../../common/types/domain';
import { buildBaseCaseSummaryPrompt } from '../base/base_prompt';
import { PageAttachmentType, PersistableAttachmentType } from '../types';

export function buildObsCaseSummaryPrompt(caseData: Case): string {
  const { comments = [] } = caseData;

  let prompt = '';

  prompt += buildBaseCaseSummaryPrompt(caseData);
  prompt += buildCaseActivitySummary(comments);
  prompt += getAnalysisInstructions();

  return prompt;
}

function getAnalysisInstructions() {
  return `## Analysis Instructions\n
  Provide a concise 3-4 sentence summary without any title that includes:\n
  1. The core issue or incident being reported\n
  2. The potential impact or severity level\n
  3. Any relevant patterns\n
  4. Any Synthetics monitors attached\n
  Apart from that, provide following numbers in bullet points: Alerts and SLOs, only if they are available in the format of <alerts_count> Alerts.\n
  Suggest next steps for investigation.\n\n
  Addiontial instructions: Focus on investigation related details and avoid referring to specific users.\n\n
  Do not start summary with saying markdown.`;
}

function buildCaseActivitySummary(comments: Attachments) {
  const alertRules = getAlertRulesFromComments(comments);
  const slos: Record<string, string> = getSLOsFromComments(comments);
  const syntheticsMonitors: Record<string, string> = getSyntheticsMonitorsFromComments(comments);
  const userComments = getUserComments(comments);

  const alertRulesSummary = getAlertRulesSummary(alertRules);
  const sloSummary = getSLOSummary(slos);
  const syntheticsMonitorsSummary = getSyntheticsMonitorsSummary(syntheticsMonitors);
  const userCommentsSummary = getUserCommentsSummary(userComments);

  return getCaseActivitySummary([
    alertRulesSummary,
    sloSummary,
    syntheticsMonitorsSummary,
    userCommentsSummary,
  ]);
}

function getCaseActivitySummary(summary: string[]) {
  const activitySummary = summary.join('\n');
  return `## Activity Summary\n${activitySummary}\n`;
}

function getAlertRulesSummary(alertRules: Set<string>) {
  let alertRulesSummary = '';

  if (alertRules.size > 0) {
    alertRulesSummary += `- **Total Alerts**: ${alertRules.size}\n`;
    alertRulesSummary += `- **Alert Rules**: ${Array.from(alertRules).join(', ')}\n`;
  }

  return alertRulesSummary;
}

function getSLOSummary(slos: Record<string, string>) {
  let sloSummary = '';
  const sloCommmentIds = Object.keys(slos);
  const sloLabels = Object.values(slos);

  if (sloCommmentIds.length > 0) {
    sloSummary += `- **Total SLOs**: ${sloCommmentIds.length}\n`;
    sloSummary += `- **SLOs**: ${Array.from(sloLabels).join(', ')}\n`;
  }

  return sloSummary;
}

function getSyntheticsMonitorsSummary(syntheticsMonitors: Record<string, string>) {
  let syntheticsMonitorsSummary = '';
  const syntheticsMonitorsCommmentIds = Object.keys(syntheticsMonitors);
  const syntheticsMonitorsLabels = Object.values(syntheticsMonitors);

  if (syntheticsMonitorsCommmentIds.length > 0) {
    syntheticsMonitorsSummary += `- **Total Synthetics Monitors**: ${syntheticsMonitorsCommmentIds.length}\n`;
    syntheticsMonitorsSummary += `- **Synthetics Monitors**: ${Array.from(
      syntheticsMonitorsLabels
    ).join(', ')}\n`;
  }

  return syntheticsMonitorsSummary;
}

function getUserCommentsSummary(userComments: Set<string>) {
  let userCommentsSummary = '';

  if (userComments.size > 0) {
    userCommentsSummary += `- **Total comments or updates**: ${userComments.size}\n\n`;
    userCommentsSummary += `### User Comments\n`;
    userCommentsSummary += Array.from(userComments).join('\n');
  }

  return userCommentsSummary;
}

function getAlertRulesFromComments(comments: Attachments): Set<string> {
  const alertRules = new Set<string>();

  comments.forEach((comment) => {
    if (comment.type === AttachmentType.alert && comment.rule?.name) {
      alertRules.add(comment.rule.name);
    }
  });
  return alertRules;
}

function getSLOsFromComments(comments: Attachments): Record<string, string> {
  const slos: Record<string, string> = {};
  comments.forEach((comment) => {
    if (
      comment.type === AttachmentType.persistableState &&
      comment.persistableStateAttachmentTypeId === PersistableAttachmentType.page
    ) {
      const pageAttachment = comment.persistableStateAttachmentState;
      if (pageAttachment.type === PageAttachmentType.slo_history) {
        const sloCommentId = comment.id;
        const sloLabel = (pageAttachment.url as { label: string }).label;
        if (sloCommentId && sloLabel) {
          slos[sloCommentId] = sloLabel;
        }
      }
    }
  });
  return slos;
}

function getSyntheticsMonitorsFromComments(comments: Attachments): Record<string, string> {
  const syntheticsMonitors: Record<string, string> = {};
  comments.forEach((comment) => {
    if (
      comment.type === AttachmentType.persistableState &&
      comment.persistableStateAttachmentTypeId === PersistableAttachmentType.page
    ) {
      const pageAttachment = comment.persistableStateAttachmentState;
      if (pageAttachment.type === PageAttachmentType.synthetics_monitor) {
        const monitorCommentId = comment.id;
        const monitorLabel = (pageAttachment.url as { label: string }).label;
        if (monitorCommentId && monitorLabel) {
          syntheticsMonitors[monitorCommentId] = monitorLabel;
        }
      }
    }
  });
  return syntheticsMonitors;
}

function getUserComments(comments: Attachments): Set<string> {
  const userComments = new Set<string>();
  comments.forEach((comment) => {
    if (comment.type === AttachmentType.user && comment.comment) {
      userComments.add(comment.comment);
    }
  });
  return userComments;
}
