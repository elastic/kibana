/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ProposalStatus } from '../../common';

export const PROPOSAL_WITHOUT_ACTION_LABEL = i18n.translate(
  'xpack.agenticInvestigations.proposals.noAutomatedAction',
  { defaultMessage: 'No automated action' }
);

/** Translated display labels for every proposal status value. */
export const STATUS_BADGE_LABELS: Record<ProposalStatus, string> = {
  approved: i18n.translate(
    'xpack.agenticInvestigations.proposals.attachments.statusBadge.approved',
    { defaultMessage: 'Approved' }
  ),
  pending: i18n.translate('xpack.agenticInvestigations.proposals.attachments.statusBadge.pending', {
    defaultMessage: 'Pending',
  }),
  executing: i18n.translate(
    'xpack.agenticInvestigations.proposals.attachments.statusBadge.executing',
    { defaultMessage: 'Executing' }
  ),
  succeeded: i18n.translate(
    'xpack.agenticInvestigations.proposals.attachments.statusBadge.succeeded',
    { defaultMessage: 'Succeeded' }
  ),
  failed: i18n.translate('xpack.agenticInvestigations.proposals.attachments.statusBadge.failed', {
    defaultMessage: 'Failed',
  }),
  dismissed: i18n.translate(
    'xpack.agenticInvestigations.proposals.attachments.statusBadge.dismissed',
    { defaultMessage: 'Dismissed' }
  ),
};
