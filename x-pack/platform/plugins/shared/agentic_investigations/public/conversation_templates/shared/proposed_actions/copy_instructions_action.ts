/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';
import type { ApprovalAction, ApprovalProposal } from '@kbn/proposals-ui';
import { copyAgentInstructions } from '../copy_agent_instructions';

const COPY_AGENT_INSTRUCTIONS_LABEL = i18n.translate(
  'xpack.agenticInvestigations.proposedAction.copyAgentInstructions',
  { defaultMessage: 'Copy agent instructions' }
);

/**
 * A "Copy agent instructions" button for a proposed action's footer. It copies what the Actions
 * menu copies, and also asks the agent to evaluate this proposed action, so a person can have a
 * local agent weigh it up before deciding.
 */
export const createCopyInstructionsAction = (
  core: Pick<CoreStart, 'http' | 'notifications'>,
  investigationId: string,
  proposal: Pick<ApprovalProposal, 'title' | 'comment'>
): ApprovalAction => ({
  label: COPY_AGENT_INSTRUCTIONS_LABEL,
  iconType: 'copy',
  onClick: () => {
    copyAgentInstructions(core, investigationId, {
      title: proposal.title,
      details: proposal.comment,
    });
  },
  'data-test-subj': 'investigationProposedActionCopyAgentInstructions',
});
