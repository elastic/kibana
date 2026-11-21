/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const WAITING_ON_YOU = i18n.translate('xpack.cases.investigations.proposals.waitingOnYou', {
  defaultMessage: 'Waiting on you',
});

export const PENDING_COUNT = (count: number) =>
  i18n.translate('xpack.cases.investigations.proposals.pendingCount', {
    defaultMessage: '{count} pending',
    values: { count },
  });

export const RESPONSE_ACTIONS_FIRST = i18n.translate(
  'xpack.cases.investigations.proposals.responseActionsFirst',
  {
    defaultMessage: 'Response actions first',
  }
);

export const PROPOSALS_LOAD_ERROR = i18n.translate(
  'xpack.cases.investigations.proposals.proposalsLoadError',
  {
    defaultMessage: 'Could not load the proposed actions',
  }
);

export const EMPTY_WITH_AI = i18n.translate('xpack.cases.investigations.proposals.emptyWithAi', {
  defaultMessage: 'Nothing is waiting on you. Agents propose actions here for your approval.',
});

export const EMPTY_WITHOUT_AI = i18n.translate(
  'xpack.cases.investigations.proposals.emptyWithoutAi',
  {
    defaultMessage:
      'Nothing is waiting on you. Actions you take are recorded as tasks, with who did them.',
  }
);

export const SHOW_FEWER = i18n.translate('xpack.cases.investigations.proposals.showFewer', {
  defaultMessage: 'Show fewer',
});

export const SHOW_MORE = (count: number, categories: string) =>
  i18n.translate('xpack.cases.investigations.proposals.showMore', {
    defaultMessage: 'Show {count} more ({categories})',
    values: { count, categories },
  });

export const CATEGORY_CONTAIN = i18n.translate(
  'xpack.cases.investigations.proposals.categoryContain',
  {
    defaultMessage: 'Contain',
  }
);

export const CATEGORY_BLOCK = i18n.translate('xpack.cases.investigations.proposals.categoryBlock', {
  defaultMessage: 'Block',
});

export const CATEGORY_ESCALATE = i18n.translate(
  'xpack.cases.investigations.proposals.categoryEscalate',
  {
    defaultMessage: 'Escalate',
  }
);

export const CATEGORY_COLLECT_EVIDENCE = i18n.translate(
  'xpack.cases.investigations.proposals.categoryCollectEvidence',
  {
    defaultMessage: 'Collect evidence',
  }
);

export const CATEGORY_TUNE_DETECTION = i18n.translate(
  'xpack.cases.investigations.proposals.categoryTuneDetection',
  {
    defaultMessage: 'Tune detection',
  }
);

export const DISRUPTIVE = i18n.translate('xpack.cases.investigations.proposals.disruptive', {
  defaultMessage: 'Disruptive',
});

export const WIDE_IMPACT = i18n.translate('xpack.cases.investigations.proposals.wideImpact', {
  defaultMessage: 'Wide impact',
});

export const REVISED_VERSION = (version: number) =>
  i18n.translate('xpack.cases.investigations.proposals.revisedVersion', {
    defaultMessage: 'revised v{version}',
    values: { version },
  });

export const EVIDENCE_LABEL = i18n.translate('xpack.cases.investigations.proposals.evidenceLabel', {
  defaultMessage: 'Evidence',
});

export const NO_REASON_GIVEN = i18n.translate(
  'xpack.cases.investigations.proposals.noReasonGiven',
  {
    defaultMessage: 'No reason given',
  }
);

export const REASON_LINE = (reason: string) =>
  i18n.translate('xpack.cases.investigations.proposals.reasonLine', {
    defaultMessage: 'Reason: {reason}',
    values: { reason },
  });

export const APPROVE = i18n.translate('xpack.cases.investigations.proposals.approve', {
  defaultMessage: 'Approve',
});

export const MODIFY = i18n.translate('xpack.cases.investigations.proposals.modify', {
  defaultMessage: 'Modify',
});

export const REJECT = i18n.translate('xpack.cases.investigations.proposals.reject', {
  defaultMessage: 'Reject',
});

export const REOPEN = i18n.translate('xpack.cases.investigations.proposals.reopen', {
  defaultMessage: 'Reopen',
});

export const APPROVED = i18n.translate('xpack.cases.investigations.proposals.approved', {
  defaultMessage: 'Approved',
});

export const APPROVED_BY = (name: string) =>
  i18n.translate('xpack.cases.investigations.proposals.approvedBy', {
    defaultMessage: 'Approved by {name}',
    values: { name },
  });

export const REJECTED = i18n.translate('xpack.cases.investigations.proposals.rejected', {
  defaultMessage: 'Rejected',
});

export const REJECTED_BY = (name: string) =>
  i18n.translate('xpack.cases.investigations.proposals.rejectedBy', {
    defaultMessage: 'Rejected by {name}',
    values: { name },
  });

export const WITHDRAWN = i18n.translate('xpack.cases.investigations.proposals.withdrawn', {
  defaultMessage: 'Withdrawn, investigation closed',
});

export const CANCEL = i18n.translate('xpack.cases.investigations.proposals.cancel', {
  defaultMessage: 'Cancel',
});

export const CLOSE = i18n.translate('xpack.cases.investigations.proposals.close', {
  defaultMessage: 'Close',
});

export const THE_AGENT = i18n.translate('xpack.cases.investigations.proposals.theAgent', {
  defaultMessage: 'The agent',
});

export const PROPOSAL_REF = (ref: string) =>
  i18n.translate('xpack.cases.investigations.proposals.proposalRef', {
    defaultMessage: 'Proposal {ref}',
    values: { ref },
  });

export const APPROVED_TOAST = (title: string) =>
  i18n.translate('xpack.cases.investigations.proposals.approvedToast', {
    defaultMessage: 'Approved: {title}',
    values: { title },
  });

export const REJECTED_TOAST = (title: string) =>
  i18n.translate('xpack.cases.investigations.proposals.rejectedToast', {
    defaultMessage: 'Rejected: {title}. The reason was recorded.',
    values: { title },
  });

export const REOPENED_TOAST = (title: string) =>
  i18n.translate('xpack.cases.investigations.proposals.reopenedToast', {
    defaultMessage: 'Reopened: {title}',
    values: { title },
  });

export const REVISED_TOAST = (version: number) =>
  i18n.translate('xpack.cases.investigations.proposals.revisedToast', {
    defaultMessage: 'Updated the proposal to v{version}. It still needs your approval.',
    values: { version },
  });

export const APPROVE_MODAL_TITLE = (title: string) =>
  i18n.translate('xpack.cases.investigations.proposals.approveModalTitle', {
    defaultMessage: '{title}?',
    values: { title },
  });

export const APPROVE_CALLOUT_DISRUPTIVE = i18n.translate(
  'xpack.cases.investigations.proposals.approveCalloutDisruptive',
  {
    defaultMessage:
      'This action is disruptive. It takes effect right away and is recorded under your name.',
  }
);

export const APPROVE_CALLOUT_WIDE = i18n.translate(
  'xpack.cases.investigations.proposals.approveCalloutWide',
  {
    defaultMessage:
      'This action is wide in impact. It takes effect right away and is recorded under your name.',
  }
);

export const WHAT_WILL_HAPPEN = i18n.translate(
  'xpack.cases.investigations.proposals.whatWillHappen',
  {
    defaultMessage: 'What will happen',
  }
);

export const SCOPE_TABLE_CAPTION = i18n.translate(
  'xpack.cases.investigations.proposals.scopeTableCaption',
  {
    defaultMessage: 'What the action affects',
  }
);

export const SCOPE_COLUMN_ITEM = i18n.translate(
  'xpack.cases.investigations.proposals.scopeColumnItem',
  {
    defaultMessage: 'Item',
  }
);

export const SCOPE_COLUMN_DETAIL = i18n.translate(
  'xpack.cases.investigations.proposals.scopeColumnDetail',
  {
    defaultMessage: 'Detail',
  }
);

export const NO_SCOPE = i18n.translate('xpack.cases.investigations.proposals.noScope', {
  defaultMessage: 'The agent did not list what this action affects.',
});

export const WHY_PROPOSED = i18n.translate('xpack.cases.investigations.proposals.whyProposed', {
  defaultMessage: 'Why it was proposed',
});

export const ACKNOWLEDGE = (target: string) =>
  i18n.translate('xpack.cases.investigations.proposals.acknowledge', {
    defaultMessage: 'I understand this will interrupt: {target}',
    values: { target },
  });

export const THE_TARGET = i18n.translate('xpack.cases.investigations.proposals.theTarget', {
  defaultMessage: 'the target',
});

export const REJECT_MODAL_TITLE = i18n.translate(
  'xpack.cases.investigations.proposals.rejectModalTitle',
  {
    defaultMessage: 'Reject this proposal?',
  }
);

export const REJECT_REASON_LABEL = i18n.translate(
  'xpack.cases.investigations.proposals.rejectReasonLabel',
  {
    defaultMessage: 'Why is it not right?',
  }
);

export const REJECT_REASON_REQUIRED = i18n.translate(
  'xpack.cases.investigations.proposals.rejectReasonRequired',
  {
    defaultMessage: 'Choose a reason.',
  }
);

export const REJECT_NOTE_LABEL = i18n.translate(
  'xpack.cases.investigations.proposals.rejectNoteLabel',
  {
    defaultMessage: 'Add detail',
  }
);

export const REJECT_NOTE_HELP = i18n.translate(
  'xpack.cases.investigations.proposals.rejectNoteHelp',
  {
    defaultMessage:
      'Optional. Your reason is recorded in Activity and shared with the agent, so it can improve later proposals.',
  }
);

export const REJECT_NOTE_PLACEHOLDER = i18n.translate(
  'xpack.cases.investigations.proposals.rejectNotePlaceholder',
  {
    defaultMessage: 'What was wrong, or what should happen instead?',
  }
);

export const REJECT_PROPOSAL = i18n.translate(
  'xpack.cases.investigations.proposals.rejectProposal',
  {
    defaultMessage: 'Reject proposal',
  }
);

export const REOPEN_MODAL_TITLE = i18n.translate(
  'xpack.cases.investigations.proposals.reopenModalTitle',
  {
    defaultMessage: 'Reopen this proposal?',
  }
);

export const REOPEN_MODAL_BODY = (title: string) =>
  i18n.translate('xpack.cases.investigations.proposals.reopenModalBody', {
    defaultMessage: '{title} goes back to pending and the rejection reason is cleared.',
    values: { title },
  });

export const MODIFY_MODAL_TITLE = i18n.translate(
  'xpack.cases.investigations.proposals.modifyModalTitle',
  {
    defaultMessage: 'Modify this proposal',
  }
);

export const MODIFY_WITH_AGENT = (agent: string) =>
  i18n.translate('xpack.cases.investigations.proposals.modifyWithAgent', {
    defaultMessage: 'Modify with {agent}',
    values: { agent },
  });

export const CURRENT_VERSION = (version: number) =>
  i18n.translate('xpack.cases.investigations.proposals.currentVersion', {
    defaultMessage: 'Current version v{version}',
    values: { version },
  });

export const MODIFY_INTRO = i18n.translate('xpack.cases.investigations.proposals.modifyIntro', {
  defaultMessage:
    'Say what should change and edit the proposal. It becomes the next version and still needs your approval.',
});

export const MODIFY_INTRO_AGENT = (agent: string) =>
  i18n.translate('xpack.cases.investigations.proposals.modifyIntroAgent', {
    defaultMessage:
      'Tell {agent} what to change and edit the proposal. It becomes the next version, and {agent} gets your request to respond to.',
    values: { agent },
  });

export const USE_SUGGESTION = (suggestion: string) =>
  i18n.translate('xpack.cases.investigations.proposals.useSuggestion', {
    defaultMessage: 'Use the suggestion: {suggestion}',
    values: { suggestion },
  });

export const REQUEST_LABEL = i18n.translate('xpack.cases.investigations.proposals.requestLabel', {
  defaultMessage: 'What should change?',
});

export const REQUEST_PLACEHOLDER = i18n.translate(
  'xpack.cases.investigations.proposals.requestPlaceholder',
  {
    defaultMessage: 'Ask for a change or give a reason.',
  }
);

export const REQUEST_REQUIRED = i18n.translate(
  'xpack.cases.investigations.proposals.requestRequired',
  {
    defaultMessage: 'Say what should change.',
  }
);

export const FIELD_TITLE = i18n.translate('xpack.cases.investigations.proposals.fieldTitle', {
  defaultMessage: 'Title',
});

export const TITLE_REQUIRED = i18n.translate('xpack.cases.investigations.proposals.titleRequired', {
  defaultMessage: 'Enter a title.',
});

export const FIELD_EFFECT = i18n.translate('xpack.cases.investigations.proposals.fieldEffect', {
  defaultMessage: 'What it does',
});

export const APPROVE_THIS_VERSION = i18n.translate(
  'xpack.cases.investigations.proposals.approveThisVersion',
  { defaultMessage: 'Approve this version' }
);

export const REVISE_PROPOSAL = i18n.translate(
  'xpack.cases.investigations.proposals.reviseProposal',
  {
    defaultMessage: 'Revise proposal',
  }
);

export const REVISED_CALLOUT = (version: number) =>
  i18n.translate('xpack.cases.investigations.proposals.revisedCallout', {
    defaultMessage: 'Updated to version {version}',
    values: { version },
  });

export const STILL_NEEDS_APPROVAL = i18n.translate(
  'xpack.cases.investigations.proposals.stillNeedsApproval',
  {
    defaultMessage: 'The proposal still needs your approval.',
  }
);

export const AGENT_WORKING = (agent: string) =>
  i18n.translate('xpack.cases.investigations.proposals.agentWorking', {
    defaultMessage: '{agent} is reading your request',
    values: { agent },
  });

export const AGENT_NO_REPLY = i18n.translate('xpack.cases.investigations.proposals.agentNoReply', {
  defaultMessage: 'The agent did not reply with text.',
});

export const AGENT_FAILED = (agent: string) =>
  i18n.translate('xpack.cases.investigations.proposals.agentFailed', {
    defaultMessage: '{agent} could not respond. The revision is saved.',
    values: { agent },
  });

export const ARGUMENT_CONDITION = i18n.translate(
  'xpack.cases.investigations.proposals.argumentCondition',
  {
    defaultMessage: 'Applies while the evidence stands.',
  }
);

export const ARGUMENT_SOURCE = i18n.translate(
  'xpack.cases.investigations.proposals.argumentSource',
  {
    defaultMessage: 'Proposal',
  }
);

export const ARGUMENT_SO = i18n.translate('xpack.cases.investigations.proposals.argumentSo', {
  defaultMessage: 'This is the expected effect of the action.',
});

export const ARGUMENT_CHANGES = i18n.translate(
  'xpack.cases.investigations.proposals.argumentChanges',
  {
    defaultMessage: 'New evidence that contradicts these grounds would withdraw the proposal.',
  }
);

export const REJECT_REASONS = [
  i18n.translate('xpack.cases.investigations.proposals.rejectReasonTooDisruptive', {
    defaultMessage: 'Too disruptive',
  }),
  i18n.translate('xpack.cases.investigations.proposals.rejectReasonNotEnoughEvidence', {
    defaultMessage: 'Not enough evidence',
  }),
  i18n.translate('xpack.cases.investigations.proposals.rejectReasonAlreadyHandled', {
    defaultMessage: 'Already handled',
  }),
  i18n.translate('xpack.cases.investigations.proposals.rejectReasonWrongTarget', {
    defaultMessage: 'Wrong target',
  }),
  i18n.translate('xpack.cases.investigations.proposals.rejectReasonOther', {
    defaultMessage: 'Other',
  }),
] as const;
