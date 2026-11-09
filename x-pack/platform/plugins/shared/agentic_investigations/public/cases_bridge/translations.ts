/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const OPEN_CASE = {
  modalTitle: i18n.translate('xpack.agenticInvestigations.openCase.modalTitle', {
    defaultMessage: 'Open a case',
  }),
  nameLabel: i18n.translate('xpack.agenticInvestigations.openCase.nameLabel', {
    defaultMessage: 'Name',
  }),
  templateLabel: i18n.translate('xpack.agenticInvestigations.openCase.templateLabel', {
    defaultMessage: 'Template',
  }),
  templateNone: i18n.translate('xpack.agenticInvestigations.openCase.template.none', {
    defaultMessage: 'No template',
  }),
  visibilityLabel: i18n.translate('xpack.agenticInvestigations.openCase.visibilityLabel', {
    defaultMessage: 'Visibility',
  }),
  visibilityPublic: i18n.translate('xpack.agenticInvestigations.openCase.visibility.public', {
    defaultMessage: 'Public',
  }),
  visibilityRestricted: i18n.translate(
    'xpack.agenticInvestigations.openCase.visibility.restricted',
    { defaultMessage: 'Restricted' }
  ),
  restrictedHelp: i18n.translate('xpack.agenticInvestigations.openCase.visibility.restrictedHelp', {
    defaultMessage: 'Only assignees can see this case, its alerts, and the linked investigations.',
  }),
  publicHelp: i18n.translate('xpack.agenticInvestigations.openCase.visibility.publicHelp', {
    defaultMessage:
      'Everyone with access to Cases in this space can see this case and the linked investigations.',
  }),
  assigneesLabel: i18n.translate('xpack.agenticInvestigations.openCase.assigneesLabel', {
    defaultMessage: 'Assignees',
  }),
  assigneesRestrictedHelp: i18n.translate(
    'xpack.agenticInvestigations.openCase.assigneesRestrictedHelp',
    {
      defaultMessage:
        'Assignees are the people who can see a restricted case. You stay assigned so you keep access.',
    }
  ),
  linkLabel: i18n.translate('xpack.agenticInvestigations.openCase.linkLabel', {
    defaultMessage: 'Investigations to link',
  }),
  linkHelp: i18n.translate('xpack.agenticInvestigations.openCase.linkHelp', {
    defaultMessage:
      'Linked, not copied. Each investigation keeps its chat and evidence and links back to this case.',
  }),
  linkSearchPlaceholder: i18n.translate(
    'xpack.agenticInvestigations.openCase.linkSearchPlaceholder',
    { defaultMessage: 'Search open investigations' }
  ),
  thisInvestigation: i18n.translate('xpack.agenticInvestigations.openCase.thisInvestigation', {
    defaultMessage: 'This investigation',
  }),
  selectedCount: (count: number) =>
    i18n.translate('xpack.agenticInvestigations.openCase.selectedCount', {
      defaultMessage: '{count} selected',
      values: { count },
    }),
  investigationsError: i18n.translate('xpack.agenticInvestigations.openCase.investigationsError', {
    defaultMessage: "Investigations couldn't be loaded",
  }),
  tryAgain: i18n.translate('xpack.agenticInvestigations.openCase.tryAgain', {
    defaultMessage: 'Try again',
  }),
  addToExistingInstead: i18n.translate(
    'xpack.agenticInvestigations.openCase.addToExistingInstead',
    { defaultMessage: 'Add to existing case instead' }
  ),
  submit: i18n.translate('xpack.agenticInvestigations.openCase.submit', {
    defaultMessage: 'Open case',
  }),
  cancel: i18n.translate('xpack.agenticInvestigations.openCase.cancel', {
    defaultMessage: 'Cancel',
  }),
  missingName: i18n.translate('xpack.agenticInvestigations.openCase.missingName', {
    defaultMessage: 'Enter a name for the case.',
  }),
  successToastTitle: (caseNumber: string) =>
    i18n.translate('xpack.agenticInvestigations.openCase.successToastTitle', {
      defaultMessage: 'Case {caseNumber} opened',
      values: { caseNumber },
    }),
  successToastText: (count: number) =>
    i18n.translate('xpack.agenticInvestigations.openCase.successToastText', {
      defaultMessage: '{count, plural, one {# investigation} other {# investigations}} linked.',
      values: { count },
    }),
  pushedToastText: (count: number, connectorName: string) =>
    i18n.translate('xpack.agenticInvestigations.openCase.pushedToastText', {
      defaultMessage:
        '{count, plural, one {# investigation} other {# investigations}} linked and pushed to {connectorName}.',
      values: { count, connectorName },
    }),
  pushFailedToastText: (connectorName: string) =>
    i18n.translate('xpack.agenticInvestigations.openCase.pushFailedToastText', {
      defaultMessage: "The push to {connectorName} didn't go through. Push from the case.",
      values: { connectorName },
    }),
  pushLabel: (connectorName: string) =>
    i18n.translate('xpack.agenticInvestigations.openCase.pushLabel', {
      defaultMessage: 'Push to {connectorName} when the case opens',
      values: { connectorName },
    }),
  pushHelp: (connectorName: string) =>
    i18n.translate('xpack.agenticInvestigations.openCase.pushHelp', {
      defaultMessage:
        'Creates an incident in {connectorName} as soon as the case opens. Status changes sync both ways.',
      values: { connectorName },
    }),
  templateConnectorFallback: i18n.translate(
    'xpack.agenticInvestigations.openCase.templateConnectorFallback',
    { defaultMessage: "the template's connector" }
  ),
  partialToastText: (failed: number) =>
    i18n.translate('xpack.agenticInvestigations.openCase.partialToastText', {
      defaultMessage:
        "{failed, plural, one {# investigation} other {# investigations}} couldn't be linked. Link {failed, plural, one {it} other {them}} from the case's Related tab.",
      values: { failed },
    }),
  errorToastTitle: i18n.translate('xpack.agenticInvestigations.openCase.errorToastTitle', {
    defaultMessage: "Couldn't open the case",
  }),
  errorToastText: i18n.translate('xpack.agenticInvestigations.openCase.errorToastText', {
    defaultMessage:
      'Your entries are still in the form. Try again, and if this continues, check that Cases is available in this space.',
  }),
  viewCase: i18n.translate('xpack.agenticInvestigations.openCase.viewCase', {
    defaultMessage: 'View case',
  }),
};

export const ADD_TO_CASE = {
  title: i18n.translate('xpack.agenticInvestigations.addToCase.title', {
    defaultMessage: 'Select case',
  }),
  suggestedTitle: i18n.translate('xpack.agenticInvestigations.addToCase.suggestedTitle', {
    defaultMessage: 'Suggested',
  }),
  suggestedBadge: i18n.translate('xpack.agenticInvestigations.addToCase.suggestedBadge', {
    defaultMessage: 'Next-up',
  }),
  suggestedBody: i18n.translate('xpack.agenticInvestigations.addToCase.suggestedBody', {
    defaultMessage:
      'Open cases that Elastic AI Agent finds similar to this investigation will show here.',
  }),
  openNewCase: i18n.translate('xpack.agenticInvestigations.addToCase.openNewCase', {
    defaultMessage: 'Open a new case',
  }),
  searchPlaceholder: i18n.translate('xpack.agenticInvestigations.addToCase.searchPlaceholder', {
    defaultMessage: 'Search cases',
  }),
  scopeNote: i18n.translate('xpack.agenticInvestigations.addToCase.scopeNote', {
    defaultMessage:
      "Showing open cases you can see. Restricted cases you aren't assigned to aren't listed.",
  }),
  select: i18n.translate('xpack.agenticInvestigations.addToCase.select', {
    defaultMessage: 'Select',
  }),
  noMatches: i18n.translate('xpack.agenticInvestigations.addToCase.noMatches', {
    defaultMessage: 'No open cases match your search.',
  }),
  columnCase: i18n.translate('xpack.agenticInvestigations.addToCase.column.case', {
    defaultMessage: 'Case',
  }),
  columnStatus: i18n.translate('xpack.agenticInvestigations.addToCase.column.status', {
    defaultMessage: 'Status',
  }),
  columnSeverity: i18n.translate('xpack.agenticInvestigations.addToCase.column.severity', {
    defaultMessage: 'Severity',
  }),
  restricted: i18n.translate('xpack.agenticInvestigations.addToCase.restricted', {
    defaultMessage: 'Restricted',
  }),
  successToastTitle: (caseNumber: string) =>
    i18n.translate('xpack.agenticInvestigations.addToCase.successToastTitle', {
      defaultMessage: 'Investigation linked to case {caseNumber}',
      values: { caseNumber },
    }),
  successToastText: (title: string) =>
    i18n.translate('xpack.agenticInvestigations.addToCase.successToastText', {
      defaultMessage: '{title} now shows on the case, and the investigation links back to it.',
      values: { title },
    }),
  errorToastTitle: i18n.translate('xpack.agenticInvestigations.addToCase.errorToastTitle', {
    defaultMessage: "Couldn't link the investigation",
  }),
};

export const RELATED = {
  title: i18n.translate('xpack.agenticInvestigations.caseSection.related.title', {
    defaultMessage: 'Investigations',
  }),
  linkInvestigation: i18n.translate(
    'xpack.agenticInvestigations.caseSection.related.linkInvestigation',
    { defaultMessage: 'Link investigation…' }
  ),
  columnInvestigation: i18n.translate(
    'xpack.agenticInvestigations.caseSection.related.column.investigation',
    { defaultMessage: 'Investigation' }
  ),
  columnStatus: i18n.translate('xpack.agenticInvestigations.caseSection.related.column.status', {
    defaultMessage: 'Status',
  }),
  columnSeverity: i18n.translate(
    'xpack.agenticInvestigations.caseSection.related.column.severity',
    { defaultMessage: 'Severity' }
  ),
  columnActions: i18n.translate('xpack.agenticInvestigations.caseSection.related.column.actions', {
    defaultMessage: 'Actions',
  }),
  severity: {
    low: i18n.translate('xpack.agenticInvestigations.caseSection.related.severity.low', {
      defaultMessage: 'Low',
    }),
    medium: i18n.translate('xpack.agenticInvestigations.caseSection.related.severity.medium', {
      defaultMessage: 'Medium',
    }),
    high: i18n.translate('xpack.agenticInvestigations.caseSection.related.severity.high', {
      defaultMessage: 'High',
    }),
    critical: i18n.translate('xpack.agenticInvestigations.caseSection.related.severity.critical', {
      defaultMessage: 'Critical',
    }),
  } as Record<string, string>,
  columnVerdict: i18n.translate(
    'xpack.agenticInvestigations.caseSection.related.column.aiVerdict',
    { defaultMessage: 'AI verdict' }
  ),
  columnProposals: i18n.translate(
    'xpack.agenticInvestigations.caseSection.related.column.proposals',
    { defaultMessage: 'Proposals' }
  ),
  columnRelatedBy: i18n.translate(
    'xpack.agenticInvestigations.caseSection.related.column.relatedBy',
    { defaultMessage: 'Related by' }
  ),
  relatedByAiVerdict: i18n.translate(
    'xpack.agenticInvestigations.caseSection.related.relatedByAiVerdict',
    { defaultMessage: 'AI verdict' }
  ),
  linkedBadge: i18n.translate('xpack.agenticInvestigations.caseSection.related.linked', {
    defaultMessage: 'Linked',
  }),
  open: i18n.translate('xpack.agenticInvestigations.caseSection.related.open', {
    defaultMessage: 'Open',
  }),
  none: i18n.translate('xpack.agenticInvestigations.caseSection.related.none', {
    defaultMessage: 'None',
  }),
  statusOpen: i18n.translate('xpack.agenticInvestigations.caseSection.related.status.open', {
    defaultMessage: 'Open',
  }),
  statusClosed: i18n.translate('xpack.agenticInvestigations.caseSection.related.status.closed', {
    defaultMessage: 'Closed',
  }),
  pending: (count: number) =>
    i18n.translate('xpack.agenticInvestigations.caseSection.related.pending', {
      defaultMessage: '{count} pending',
      values: { count },
    }),
  showProposals: (count: number) =>
    i18n.translate('xpack.agenticInvestigations.caseSection.related.proposals.toggleShow', {
      defaultMessage: 'Show {count, plural, one {# pending proposal} other {# pending proposals}}',
      values: { count },
    }),
  hideProposals: (count: number) =>
    i18n.translate('xpack.agenticInvestigations.caseSection.related.proposals.toggleHide', {
      defaultMessage: 'Hide {count, plural, one {# pending proposal} other {# pending proposals}}',
      values: { count },
    }),
  pendingBadge: i18n.translate(
    'xpack.agenticInvestigations.caseSection.related.proposals.pending',
    { defaultMessage: 'Pending' }
  ),
  reviewInAlertZero: i18n.translate(
    'xpack.agenticInvestigations.caseSection.related.proposals.review',
    { defaultMessage: 'Review in AlertZero' }
  ),
  ownedBy: i18n.translate('xpack.agenticInvestigations.caseSection.related.proposals.ownedBy', {
    defaultMessage: 'Proposals are approved or dismissed on the investigation, in AlertZero.',
  }),
  inaccessible: (count: number) =>
    i18n.translate('xpack.agenticInvestigations.caseSection.related.inaccessible', {
      defaultMessage:
        "{count, plural, one {# more linked investigation} other {# more linked investigations}} you don't have access to.",
      values: { count },
    }),
  errorTitle: i18n.translate('xpack.agenticInvestigations.caseSection.related.errorTitle', {
    defaultMessage: "Related investigations couldn't be loaded",
  }),
  errorBody: i18n.translate('xpack.agenticInvestigations.caseSection.related.errorBody', {
    defaultMessage:
      'The rest of the case is fine. Try again, and if this continues, check that AlertZero is available in this space.',
  }),
  retry: i18n.translate('xpack.agenticInvestigations.caseSection.related.retry', {
    defaultMessage: 'Try again',
  }),
  linkedToastTitle: i18n.translate('xpack.agenticInvestigations.caseSection.related.linkedToast', {
    defaultMessage: 'Investigation linked',
  }),
  linkedToastText: (title: string) =>
    i18n.translate('xpack.agenticInvestigations.caseSection.related.linkedToastText', {
      defaultMessage: '{title} now shows on this case and links back to it.',
      values: { title },
    }),
  linkFailedToast: i18n.translate(
    'xpack.agenticInvestigations.caseSection.related.linkFailedToast',
    { defaultMessage: "Couldn't link the investigation" }
  ),
  untitled: i18n.translate('xpack.agenticInvestigations.caseSection.related.untitled', {
    defaultMessage: 'Untitled investigation',
  }),
};

export const LINK_PICKER = {
  title: i18n.translate('xpack.agenticInvestigations.caseSection.linkPicker.titleInvestigations', {
    defaultMessage: 'Link investigations',
  }),
  help: i18n.translate('xpack.agenticInvestigations.caseSection.linkPicker.helpInvestigations', {
    defaultMessage:
      'Linked, not copied. Each investigation keeps its chat and evidence and links back to this case.',
  }),
  search: i18n.translate(
    'xpack.agenticInvestigations.caseSection.linkPicker.searchInvestigations',
    { defaultMessage: 'Search open investigations' }
  ),
  submit: i18n.translate('xpack.agenticInvestigations.caseSection.linkPicker.submit', {
    defaultMessage: 'Link',
  }),
  cancel: i18n.translate('xpack.agenticInvestigations.caseSection.linkPicker.cancel', {
    defaultMessage: 'Cancel',
  }),
  empty: i18n.translate('xpack.agenticInvestigations.caseSection.linkPicker.empty', {
    defaultMessage: 'No open investigations without a case.',
  }),
};

export const SIDEBAR = {
  linkedCount: (count: number) =>
    i18n.translate('xpack.agenticInvestigations.caseSection.verdict.linkedCount', {
      defaultMessage:
        '{count, plural, one {# linked investigation} other {# linked investigations}}',
      values: { count },
    }),
  pendingCount: (count: number) =>
    i18n.translate('xpack.agenticInvestigations.caseSection.verdict.pendingCount', {
      defaultMessage: '{count, plural, one {# pending proposal} other {# pending proposals}}',
      values: { count },
    }),
};

export const CLOSE_MODAL = {
  closeInvestigations: (count: number) =>
    i18n.translate('xpack.agenticInvestigations.closeCaseModal.closeInvestigations', {
      defaultMessage:
        'Close {count, plural, one {# linked investigation} other {# linked investigations}}',
      values: { count },
    }),
  pendingHelp: (count: number, caseRef: string) =>
    i18n.translate('xpack.agenticInvestigations.closeCaseModal.closeInvestigationsHelp', {
      defaultMessage:
        '{count, plural, one {# pending proposal on these investigations is} other {# pending proposals on these investigations are}} dismissed with the note Closed with case {caseRef}.',
      values: { count, caseRef },
    }),
  closeInvestigationsUnknown: i18n.translate(
    'xpack.agenticInvestigations.closeCaseModal.closeInvestigationsUnknown',
    { defaultMessage: 'Close the linked investigations' }
  ),
  noPending: i18n.translate('xpack.agenticInvestigations.closeCaseModal.noPendingProposals', {
    defaultMessage: 'No pending proposals.',
  }),
};

export const ATTACHMENT = {
  label: i18n.translate('xpack.agenticInvestigations.caseAttachment.label', {
    defaultMessage: 'Investigations',
  }),
  linked: i18n.translate('xpack.agenticInvestigations.caseAttachment.linked', {
    defaultMessage: 'linked investigation',
  }),
  linkedInaccessible: i18n.translate(
    'xpack.agenticInvestigations.caseAttachment.linkedInaccessible',
    { defaultMessage: "linked an investigation you don't have access to" }
  ),
  removed: i18n.translate('xpack.agenticInvestigations.caseAttachment.removed', {
    defaultMessage: 'unlinked an investigation',
  }),
};

export const CASE_BADGE = {
  caseNumber: (caseNumber: string) =>
    i18n.translate('xpack.agenticInvestigations.detailsFlyout.caseBadge', {
      defaultMessage: 'Case {caseNumber}',
      values: { caseNumber },
    }),
  caseUnnumbered: i18n.translate('xpack.agenticInvestigations.detailsFlyout.caseUnnumbered', {
    defaultMessage: 'Case',
  }),
  unavailable: i18n.translate('xpack.agenticInvestigations.detailsFlyout.caseUnavailable', {
    defaultMessage: 'Case unavailable',
  }),
  unavailableTooltip: i18n.translate(
    'xpack.agenticInvestigations.detailsFlyout.caseUnavailableTooltip',
    { defaultMessage: "The case was deleted or you don't have access to it." }
  ),
  linkedLine: (caseNumber: string) =>
    i18n.translate('xpack.agenticInvestigations.detailsFlyout.linkedToCase', {
      defaultMessage: 'Linked to case {caseNumber}. Closing the case closes this investigation.',
      values: { caseNumber },
    }),
};

export const ACTIONS_VIEW_CASE = (caseNumber: string) =>
  i18n.translate('xpack.agenticInvestigations.baseActions.viewCaseNumber', {
    defaultMessage: 'View case {caseNumber}',
    values: { caseNumber },
  });

export const DECISIONS = {
  title: i18n.translate('xpack.agenticInvestigations.caseSection.decisions.title', {
    defaultMessage: 'Decisions',
  }),
  pendingBadge: (count: number) =>
    i18n.translate('xpack.agenticInvestigations.caseSection.decisions.pendingBadge', {
      values: { count },
      defaultMessage: '{count, plural, one {# decision} other {# decisions}} pending',
    }),
  proposedBy: (name: string, time: string) =>
    i18n.translate('xpack.agenticInvestigations.caseSection.decisions.proposedBy', {
      values: { name, time },
      defaultMessage: 'Proposed by {name} {time}',
    }),
  approve: i18n.translate('xpack.agenticInvestigations.caseSection.decisions.approve', {
    defaultMessage: 'Approve',
  }),
  dismiss: i18n.translate('xpack.agenticInvestigations.caseSection.decisions.dismiss', {
    defaultMessage: 'Dismiss',
  }),
  approveAriaLabel: (title: string) =>
    i18n.translate('xpack.agenticInvestigations.caseSection.decisions.approveAriaLabel', {
      values: { title },
      defaultMessage: 'Approve {title}',
    }),
  dismissAriaLabel: (title: string) =>
    i18n.translate('xpack.agenticInvestigations.caseSection.decisions.dismissAriaLabel', {
      values: { title },
      defaultMessage: 'Dismiss {title}',
    }),
  decidedCount: (count: number) =>
    i18n.translate('xpack.agenticInvestigations.caseSection.decisions.decidedCount', {
      values: { count },
      defaultMessage: '{count} decided',
    }),
  approvedBy: (name: string, time: string) =>
    i18n.translate('xpack.agenticInvestigations.caseSection.decisions.approvedBy', {
      values: { name, time },
      defaultMessage: 'Approved by {name} {time}',
    }),
  dismissedBy: (name: string, time: string) =>
    i18n.translate('xpack.agenticInvestigations.caseSection.decisions.dismissedBy', {
      values: { name, time },
      defaultMessage: 'Dismissed by {name} {time}',
    }),
  expired: (time: string) =>
    i18n.translate('xpack.agenticInvestigations.caseSection.decisions.expired', {
      values: { time },
      defaultMessage: 'Expired {time}',
    }),
  deciding: i18n.translate('xpack.agenticInvestigations.caseSection.decisions.deciding', {
    defaultMessage: 'Decided, being carried out',
  }),
  none: i18n.translate('xpack.agenticInvestigations.caseSection.decisions.none', {
    defaultMessage: 'No decisions pending.',
  }),
  noPrivilege: i18n.translate('xpack.agenticInvestigations.caseSection.decisions.noPrivilege', {
    defaultMessage:
      'Approving or dismissing needs the Proposed actions privilege and permission to update this case.',
  }),
  loadError: i18n.translate('xpack.agenticInvestigations.caseSection.decisions.loadError', {
    defaultMessage: "Couldn't load the decisions",
  }),
  approved: i18n.translate('xpack.agenticInvestigations.caseSection.decisions.approvedToast', {
    defaultMessage: 'Proposal approved',
  }),
  dismissed: i18n.translate('xpack.agenticInvestigations.caseSection.decisions.dismissedToast', {
    defaultMessage: 'Proposal dismissed',
  }),
  approveError: (title: string) =>
    i18n.translate('xpack.agenticInvestigations.caseSection.decisions.approveError', {
      values: { title },
      defaultMessage: "Couldn't approve {title}",
    }),
  dismissError: (title: string) =>
    i18n.translate('xpack.agenticInvestigations.caseSection.decisions.dismissError', {
      values: { title },
      defaultMessage: "Couldn't dismiss {title}",
    }),
  someone: i18n.translate('xpack.agenticInvestigations.caseSection.decisions.someone', {
    defaultMessage: 'Unknown user',
  }),
  attachmentLabel: i18n.translate(
    'xpack.agenticInvestigations.caseSection.decisions.attachmentLabel',
    { defaultMessage: 'Decision' }
  ),
  added: (title: string) =>
    i18n.translate('xpack.agenticInvestigations.caseSection.decisions.addedEvent', {
      values: { title },
      defaultMessage: 'added a decision to make: “{title}”',
    }),
  removed: i18n.translate('xpack.agenticInvestigations.caseSection.decisions.removedEvent', {
    defaultMessage: 'removed a decision',
  }),
  noticeWaiting: (count: number) =>
    i18n.translate('xpack.agenticInvestigations.caseSection.decisions.noticeWaiting', {
      values: { count },
      defaultMessage: '{count, plural, one {# decision} other {# decisions}} waiting',
    }),
  pendingToggle: (count: number) =>
    i18n.translate('xpack.agenticInvestigations.caseSection.decisions.pendingToggle', {
      values: { count },
      defaultMessage: 'Pending ({count})',
    }),
  decidedToggle: (count: number) =>
    i18n.translate('xpack.agenticInvestigations.caseSection.decisions.decidedToggle', {
      values: { count },
      defaultMessage: 'Decided ({count})',
    }),
  viewDecided: (count: number) =>
    i18n.translate('xpack.agenticInvestigations.caseSection.decisions.viewDecided', {
      values: { count },
      defaultMessage: 'View {count} decided',
    }),
  reviewDecisions: i18n.translate(
    'xpack.agenticInvestigations.caseSection.decisions.reviewDecisions',
    {
      defaultMessage: 'Review decisions',
    }
  ),
  toggleLegend: i18n.translate('xpack.agenticInvestigations.caseSection.decisions.toggleLegend', {
    defaultMessage: 'Show pending or decided decisions',
  }),
  searchPlaceholder: i18n.translate(
    'xpack.agenticInvestigations.caseSection.decisions.searchPlaceholder',
    {
      defaultMessage: 'Search decisions',
    }
  ),
  allInvestigations: i18n.translate(
    'xpack.agenticInvestigations.caseSection.decisions.allInvestigations',
    {
      defaultMessage: 'All investigations',
    }
  ),
  investigationFilter: i18n.translate(
    'xpack.agenticInvestigations.caseSection.decisions.investigationFilter',
    {
      defaultMessage: 'Investigation',
    }
  ),
  columnDecision: i18n.translate(
    'xpack.agenticInvestigations.caseSection.decisions.columnDecision',
    {
      defaultMessage: 'Decision',
    }
  ),
  columnInvestigation: i18n.translate(
    'xpack.agenticInvestigations.caseSection.decisions.columnInvestigation',
    {
      defaultMessage: 'Investigation',
    }
  ),
  columnCategory: i18n.translate(
    'xpack.agenticInvestigations.caseSection.decisions.columnCategory',
    {
      defaultMessage: 'Category',
    }
  ),
  columnProposed: i18n.translate(
    'xpack.agenticInvestigations.caseSection.decisions.columnProposed',
    {
      defaultMessage: 'Proposed',
    }
  ),
  columnActions: i18n.translate('xpack.agenticInvestigations.caseSection.decisions.columnActions', {
    defaultMessage: 'Actions',
  }),
  columnOutcome: i18n.translate('xpack.agenticInvestigations.caseSection.decisions.columnOutcome', {
    defaultMessage: 'Outcome',
  }),
  columnDecidedBy: i18n.translate(
    'xpack.agenticInvestigations.caseSection.decisions.columnDecidedBy',
    {
      defaultMessage: 'Decided by',
    }
  ),
  columnDecided: i18n.translate('xpack.agenticInvestigations.caseSection.decisions.columnDecided', {
    defaultMessage: 'Decided',
  }),
  nothingWaiting: i18n.translate(
    'xpack.agenticInvestigations.caseSection.decisions.nothingWaiting',
    {
      defaultMessage: 'Nothing is waiting on a decision.',
    }
  ),
  noDecisions: i18n.translate('xpack.agenticInvestigations.caseSection.decisions.noDecisions', {
    defaultMessage: 'No decisions yet.',
  }),
  noMatches: i18n.translate('xpack.agenticInvestigations.caseSection.decisions.noMatches', {
    defaultMessage: 'No decisions match your search.',
  }),
  retry: i18n.translate('xpack.agenticInvestigations.caseSection.decisions.retry', {
    defaultMessage: 'Retry',
  }),
  investigationUnavailable: i18n.translate(
    'xpack.agenticInvestigations.caseSection.decisions.investigationUnavailable',
    {
      defaultMessage: 'Investigation not available',
    }
  ),
  outcomeApproved: i18n.translate(
    'xpack.agenticInvestigations.caseSection.decisions.outcomeApproved',
    {
      defaultMessage: 'Approved',
    }
  ),
  outcomeDismissed: i18n.translate(
    'xpack.agenticInvestigations.caseSection.decisions.outcomeDismissed',
    {
      defaultMessage: 'Dismissed',
    }
  ),
  outcomeExpired: i18n.translate(
    'xpack.agenticInvestigations.caseSection.decisions.outcomeExpired',
    {
      defaultMessage: 'Expired',
    }
  ),
  outcomeDeciding: i18n.translate(
    'xpack.agenticInvestigations.caseSection.decisions.outcomeDeciding',
    {
      defaultMessage: 'Deciding',
    }
  ),
  outcomeFailed: i18n.translate('xpack.agenticInvestigations.caseSection.decisions.outcomeFailed', {
    defaultMessage: 'Failed',
  }),
  proposedByName: (name: string) =>
    i18n.translate('xpack.agenticInvestigations.caseSection.decisions.proposedByName', {
      values: { name },
      defaultMessage: 'by {name}',
    }),
  showComment: (title: string) =>
    i18n.translate('xpack.agenticInvestigations.caseSection.decisions.showComment', {
      values: { title },
      defaultMessage: 'Show the details of {title}',
    }),
  hideComment: (title: string) =>
    i18n.translate('xpack.agenticInvestigations.caseSection.decisions.hideComment', {
      values: { title },
      defaultMessage: 'Hide the details of {title}',
    }),
};

export const EVIDENCE = {
  impactTitle: i18n.translate('xpack.agenticInvestigations.caseSection.impact.title', {
    defaultMessage: 'Impact',
  }),
  hypothesesTitle: i18n.translate('xpack.agenticInvestigations.caseSection.hypotheses.title', {
    defaultMessage: 'Hypotheses',
  }),
  copiedNote: i18n.translate('xpack.agenticInvestigations.caseSection.evidence.copiedNote', {
    defaultMessage: 'Copied from the investigation when it was written.',
  }),
  fromInvestigationCopied: (title: string) =>
    i18n.translate('xpack.agenticInvestigations.caseSection.evidence.fromInvestigationCopied', {
      values: { title },
      defaultMessage: 'From {title} · Copied from the investigation when it was written.',
    }),
  typedEntity: (type: string, name: string) =>
    i18n.translate('xpack.agenticInvestigations.caseSection.impact.typedEntity', {
      values: { type, name },
      defaultMessage: '{type}: {name}',
    }),
  impactAdded: i18n.translate('xpack.agenticInvestigations.caseSection.impact.addedEvent', {
    defaultMessage: "added the investigation's impact",
  }),
  hypothesesAdded: i18n.translate('xpack.agenticInvestigations.caseSection.hypotheses.addedEvent', {
    defaultMessage: "added the investigation's hypotheses",
  }),
  removed: i18n.translate('xpack.agenticInvestigations.caseSection.evidence.removedEvent', {
    defaultMessage: 'removed copied findings',
  }),
  statusSupported: i18n.translate(
    'xpack.agenticInvestigations.caseSection.hypotheses.status.supported',
    { defaultMessage: 'Supported' }
  ),
  statusRefuted: i18n.translate(
    'xpack.agenticInvestigations.caseSection.hypotheses.status.refuted',
    { defaultMessage: 'Refuted' }
  ),
  statusOpen: i18n.translate('xpack.agenticInvestigations.caseSection.hypotheses.status.open', {
    defaultMessage: 'Open',
  }),
};
