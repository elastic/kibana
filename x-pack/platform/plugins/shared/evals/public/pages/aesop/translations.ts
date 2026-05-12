/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const AESOP_TRANSLATIONS = {
  // Page titles
  proposedSkillsTitle: i18n.translate('xpack.evals.aesop.proposedSkills.title', {
    defaultMessage: 'AESOP: Proposed Skills',
  }),
  proposedSkillsDescription: i18n.translate('xpack.evals.aesop.proposedSkills.description', {
    defaultMessage:
      'Agent Builder skills discovered through self-exploration. Review, validate, and approve for deployment.',
  }),
  explorationDashboardTitle: i18n.translate('xpack.evals.aesop.exploration.title', {
    defaultMessage: 'AESOP: Self-Exploration Dashboard',
  }),

  // Table headers
  skillNameColumn: i18n.translate('xpack.evals.aesop.table.skillName', {
    defaultMessage: 'Skill Name',
  }),
  confidenceColumn: i18n.translate('xpack.evals.aesop.table.confidence', {
    defaultMessage: 'Confidence',
  }),
  validationColumn: i18n.translate('xpack.evals.aesop.table.validation', {
    defaultMessage: 'Validation',
  }),
  reviewColumn: i18n.translate('xpack.evals.aesop.table.review', {
    defaultMessage: 'Review',
  }),

  // Buttons
  approveButton: i18n.translate('xpack.evals.aesop.actions.approve', {
    defaultMessage: 'Approve & Deploy to Agent Builder',
  }),
  rejectButton: i18n.translate('xpack.evals.aesop.actions.reject', {
    defaultMessage: 'Reject',
  }),
  viewTraceButton: i18n.translate('xpack.evals.aesop.actions.viewTrace', {
    defaultMessage: 'View Trace',
  }),
  startExplorationButton: i18n.translate('xpack.evals.aesop.actions.startExploration', {
    defaultMessage: 'Start Exploration',
  }),

  // Status messages
  validationPending: i18n.translate('xpack.evals.aesop.validation.pending', {
    defaultMessage: 'Pending',
  }),
  validationRunning: i18n.translate('xpack.evals.aesop.validation.running', {
    defaultMessage: 'Running...',
  }),
  validationPassed: i18n.translate('xpack.evals.aesop.validation.passed', {
    defaultMessage: 'Passed ({score}%)',
  }),
  validationFailed: i18n.translate('xpack.evals.aesop.validation.failed', {
    defaultMessage: 'Failed',
  }),

  // Tooltips
  patternFrequencyTooltip: i18n.translate('xpack.evals.aesop.tooltip.patternFrequency', {
    defaultMessage: 'Observed {count} times in persona behaviors',
  }),
  confidenceTooltip: i18n.translate('xpack.evals.aesop.tooltip.confidence', {
    defaultMessage: 'Agent confidence in skill usefulness (0-100%)',
  }),

  // Errors
  mustPassValidation: i18n.translate('xpack.evals.aesop.error.mustPassValidation', {
    defaultMessage: 'Skill must pass validation before approval. Current status: {status}',
  }),
  workflowsNotAvailable: i18n.translate('xpack.evals.aesop.error.workflowsNotAvailable', {
    defaultMessage:
      'Workflows Management plugin not available. Ensure xpack.workflows.enabled: true in kibana.yml',
  }),
};
