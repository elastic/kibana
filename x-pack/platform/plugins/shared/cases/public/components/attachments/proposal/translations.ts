/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ProposalImpact } from '@kbn/proposals-common';

export const PROPOSAL_DISPLAY_NAME = i18n.translate(
  'xpack.cases.attachments.proposal.displayName',
  {
    defaultMessage: 'Proposals',
  }
);

export const PROPOSALS_COUNT = (count: number) =>
  i18n.translate('xpack.cases.attachments.proposal.count', {
    values: { count },
    defaultMessage: '{count, plural, one {# proposal} other {# proposals}}',
  });

export const ADDED_PROPOSAL = i18n.translate('xpack.cases.attachments.proposal.addedEvent', {
  defaultMessage: 'added a proposal',
});

export const REMOVED_PROPOSAL = i18n.translate('xpack.cases.attachments.proposal.removedEvent', {
  defaultMessage: 'removed a proposal',
});

export const REMOVE_PROPOSAL_SUCCESS_TOAST = (title: string) =>
  i18n.translate('xpack.cases.attachments.proposal.removeSuccessToast', {
    values: { title },
    defaultMessage: 'Removed proposal "{title}" from the case',
  });

export const VIEW_INVESTIGATION = i18n.translate(
  'xpack.cases.attachments.proposal.viewInvestigation',
  { defaultMessage: 'View investigation' }
);

export const PROPOSAL_UNAVAILABLE = i18n.translate(
  'xpack.cases.attachments.proposal.unavailableBody',
  {
    defaultMessage:
      "This proposal can't be shown. It might have been deleted, or you might need access to Proposed Actions.",
  }
);

export const PROPOSAL_LOAD_ERROR = i18n.translate('xpack.cases.attachments.proposal.loadError', {
  defaultMessage: "Proposals couldn't be loaded",
});

export const PROPOSAL_LOAD_ERROR_BODY = i18n.translate(
  'xpack.cases.attachments.proposal.loadErrorBody',
  { defaultMessage: 'Refresh the page to try again.' }
);

export const NO_MATCHING_PROPOSALS = i18n.translate(
  'xpack.cases.attachments.proposal.noSearchResults',
  { defaultMessage: 'No proposals match your search.' }
);

export const NO_READABLE_PROPOSALS = i18n.translate(
  'xpack.cases.attachments.proposal.noneReadable',
  {
    defaultMessage:
      "This case's proposals can't be shown. They might have been deleted, or you might need access to Proposed Actions.",
  }
);

export const COLUMN_TITLE = i18n.translate('xpack.cases.attachments.proposal.columns.title', {
  defaultMessage: 'Title',
});

export const COLUMN_STATUS = i18n.translate('xpack.cases.attachments.proposal.columns.status', {
  defaultMessage: 'Status',
});

export const COLUMN_IMPACT = i18n.translate('xpack.cases.attachments.proposal.columns.impact', {
  defaultMessage: 'Impact',
});

export const IMPACT_LABELS: Readonly<Record<ProposalImpact, string>> = {
  low: i18n.translate('xpack.cases.attachments.proposal.impact.low', { defaultMessage: 'Low' }),
  medium: i18n.translate('xpack.cases.attachments.proposal.impact.medium', {
    defaultMessage: 'Medium',
  }),
  high: i18n.translate('xpack.cases.attachments.proposal.impact.high', { defaultMessage: 'High' }),
  critical: i18n.translate('xpack.cases.attachments.proposal.impact.critical', {
    defaultMessage: 'Critical',
  }),
};

export const COLUMN_REVISION = i18n.translate('xpack.cases.attachments.proposal.columns.revision', {
  defaultMessage: 'Revision',
});

export const COLUMN_CREATED = i18n.translate('xpack.cases.attachments.proposal.columns.created', {
  defaultMessage: 'Created',
});

export const COLUMN_ACTIONS = i18n.translate('xpack.cases.attachments.proposal.columns.actions', {
  defaultMessage: 'Actions',
});

export const LATEST_REVISION = i18n.translate('xpack.cases.attachments.proposal.latestRevision', {
  defaultMessage: 'Latest revision',
});

export const SHOW_LATEST_REVISION = i18n.translate(
  'xpack.cases.attachments.proposal.showLatestRevision',
  { defaultMessage: 'Show latest revision' }
);

export const HIDE_LATEST_REVISION = i18n.translate(
  'xpack.cases.attachments.proposal.hideLatestRevision',
  { defaultMessage: 'Hide latest revision' }
);

export const REVISION_NUMBER = (revision: number) =>
  i18n.translate('xpack.cases.attachments.proposal.revisionNumber', {
    values: { revision },
    defaultMessage: 'Revision {revision}',
  });

export const REMOVE_FROM_CASE = i18n.translate('xpack.cases.attachments.proposal.removeFromCase', {
  defaultMessage: 'Remove from case',
});

export const REPLACED_TITLE = i18n.translate('xpack.cases.attachments.proposal.replacedTitle', {
  defaultMessage: 'This proposal has been replaced.',
});

export const REPLACED_BODY = i18n.translate('xpack.cases.attachments.proposal.replacedBody', {
  defaultMessage: 'To view its latest revision, expand this proposal in Attachments > Proposals.',
});

export const REPLACED_BADGE = i18n.translate('xpack.cases.attachments.proposal.replacedBadge', {
  defaultMessage: 'Replaced',
});

export const DECIDE_CONFLICT_ERROR = i18n.translate(
  'xpack.cases.attachments.proposal.decideConflictError',
  {
    defaultMessage:
      'This proposal is no longer available to decide. Refresh the page to see its current status.',
  }
);

export const DECIDE_FORBIDDEN_ERROR = i18n.translate(
  'xpack.cases.attachments.proposal.decideForbiddenError',
  { defaultMessage: "You don't have permission to decide proposals." }
);

export const DECIDE_GENERIC_ERROR = i18n.translate(
  'xpack.cases.attachments.proposal.decideGenericError',
  { defaultMessage: "Your decision wasn't recorded. Try again." }
);
