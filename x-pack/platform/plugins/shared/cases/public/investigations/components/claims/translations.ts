/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const STATUS_OPEN = i18n.translate('xpack.cases.investigations.claims.statusOpen', {
  defaultMessage: 'Open',
});

export const STATUS_SUPPORTED = i18n.translate(
  'xpack.cases.investigations.claims.statusSupported',
  {
    defaultMessage: 'Supported',
  }
);

export const STATUS_BLOCKED = i18n.translate('xpack.cases.investigations.claims.statusBlocked', {
  defaultMessage: 'Blocked',
});

export const STATUS_REFUTED = i18n.translate('xpack.cases.investigations.claims.statusRefuted', {
  defaultMessage: 'Refuted',
});

export const STRENGTH_STRONG = i18n.translate('xpack.cases.investigations.claims.strengthStrong', {
  defaultMessage: 'Strong',
});

export const STRENGTH_MODERATE = i18n.translate(
  'xpack.cases.investigations.claims.strengthModerate',
  {
    defaultMessage: 'Moderate',
  }
);

export const STRENGTH_INCOMPLETE = i18n.translate(
  'xpack.cases.investigations.claims.strengthIncomplete',
  {
    defaultMessage: 'Incomplete',
  }
);

export const STRENGTH_UNREVIEWED = i18n.translate(
  'xpack.cases.investigations.claims.strengthUnreviewed',
  {
    defaultMessage: 'Unreviewed',
  }
);

export const STRENGTH_BLOCKED = i18n.translate(
  'xpack.cases.investigations.claims.strengthBlocked',
  {
    defaultMessage: 'Blocked',
  }
);

export const STRENGTH_UNSUPPORTED = i18n.translate(
  'xpack.cases.investigations.claims.strengthUnsupported',
  {
    defaultMessage: 'Unsupported',
  }
);

export const STRENGTH_REFUTED = i18n.translate(
  'xpack.cases.investigations.claims.strengthRefuted',
  {
    defaultMessage: 'Refuted',
  }
);

export const ANSWERS = (question: string) =>
  i18n.translate('xpack.cases.investigations.claims.answers', {
    defaultMessage: 'Answers: {question}',
    values: { question },
  });

export const CONDITION_AWAITING_REVIEW = i18n.translate(
  'xpack.cases.investigations.claims.conditionAwaitingReview',
  {
    defaultMessage: 'Awaiting human review.',
  }
);

export const CONDITION_NOT_SETTLED = i18n.translate(
  'xpack.cases.investigations.claims.conditionNotSettled',
  {
    defaultMessage: 'Not settled yet.',
  }
);

export const CONDITION_BLOCKED = i18n.translate(
  'xpack.cases.investigations.claims.conditionBlocked',
  {
    defaultMessage: 'Blocked, see the reason.',
  }
);

export const CONDITION_REVIEWED = i18n.translate(
  'xpack.cases.investigations.claims.conditionReviewed',
  {
    defaultMessage: 'Reviewed.',
  }
);

export const STEP_LINKED_EVIDENCE = i18n.translate(
  'xpack.cases.investigations.claims.stepLinkedEvidence',
  {
    defaultMessage: 'The linked evidence shows what was observed.',
  }
);

export const SOURCE_LINKED_EVIDENCE = i18n.translate(
  'xpack.cases.investigations.claims.sourceLinkedEvidence',
  {
    defaultMessage: 'Linked evidence',
  }
);

export const GAP_NOT_SETTLED = i18n.translate('xpack.cases.investigations.claims.gapNotSettled', {
  defaultMessage: 'Not yet settled',
});

export const GAP_NO_REASONING = i18n.translate('xpack.cases.investigations.claims.gapNoReasoning', {
  defaultMessage: 'Reasoning from the evidence to this claim',
});

export const GAP_NOT_RECORDED = i18n.translate('xpack.cases.investigations.claims.gapNotRecorded', {
  defaultMessage: 'Not recorded',
});

export const CLAIM_CHANGES = i18n.translate('xpack.cases.investigations.claims.claimChanges', {
  defaultMessage:
    'Linking more evidence or recording the reasoning changes how strong this claim is.',
});

export const OPEN_EVIDENCE = (ref: string) =>
  i18n.translate('xpack.cases.investigations.claims.openEvidence', {
    defaultMessage: 'Open evidence {ref}',
    values: { ref },
  });

export const WHY_LABEL = (strength: string, count: number) =>
  i18n.translate('xpack.cases.investigations.claims.whyLabel', {
    defaultMessage:
      'Why: {strength}, {count, plural, =0 {no evidence} one {# evidence item} other {# evidence items}}',
    values: { strength, count },
  });

export const WHY_ARIA = (subject: string) =>
  i18n.translate('xpack.cases.investigations.claims.whyAria', {
    defaultMessage: 'Show the evidence and reasoning behind this {subject}',
    values: { subject },
  });

export const SUBJECT_CLAIM = i18n.translate('xpack.cases.investigations.claims.subjectClaim', {
  defaultMessage: 'claim',
});

export const SUBJECT_VERDICT = i18n.translate('xpack.cases.investigations.claims.subjectVerdict', {
  defaultMessage: 'verdict',
});

export const SUBJECT_PROPOSAL = i18n.translate(
  'xpack.cases.investigations.claims.subjectProposal',
  {
    defaultMessage: 'proposal',
  }
);

export const CLOSE = i18n.translate('xpack.cases.investigations.claims.close', {
  defaultMessage: 'Close',
});

export const CANCEL = i18n.translate('xpack.cases.investigations.claims.cancel', {
  defaultMessage: 'Cancel',
});

export const EDIT = i18n.translate('xpack.cases.investigations.claims.edit', {
  defaultMessage: 'Edit',
});

export const ADD = i18n.translate('xpack.cases.investigations.claims.add', {
  defaultMessage: 'Add',
});

export const LINK = i18n.translate('xpack.cases.investigations.claims.link', {
  defaultMessage: 'Link',
});

export const UNLINK = i18n.translate('xpack.cases.investigations.claims.unlink', {
  defaultMessage: 'Unlink',
});

export const UNLINK_ARIA = (ref: string) =>
  i18n.translate('xpack.cases.investigations.claims.unlinkAria', {
    defaultMessage: 'Unlink evidence {ref}',
    values: { ref },
  });

export const COMMENT = i18n.translate('xpack.cases.investigations.claims.comment', {
  defaultMessage: 'Comment',
});

export const SAVE_CHANGES = i18n.translate('xpack.cases.investigations.claims.saveChanges', {
  defaultMessage: 'Save changes',
});

export const THE_AGENT = i18n.translate('xpack.cases.investigations.claims.theAgent', {
  defaultMessage: 'The agent',
});

export const CLAIM_FLYOUT_ARIA = i18n.translate(
  'xpack.cases.investigations.claims.claimFlyoutAria',
  {
    defaultMessage: 'Claim',
  }
);

export const LOADING_CLAIM = i18n.translate('xpack.cases.investigations.claims.loadingClaim', {
  defaultMessage: 'Loading the claim',
});

export const CLAIM_LOAD_ERROR = i18n.translate('xpack.cases.investigations.claims.claimLoadError', {
  defaultMessage: 'Could not load the claim',
});

export const CLAIM_REF = (ref: string) =>
  i18n.translate('xpack.cases.investigations.claims.claimRef', {
    defaultMessage: 'Claim {ref}',
    values: { ref },
  });

export const NEEDS_YOUR_REVIEW = i18n.translate(
  'xpack.cases.investigations.claims.needsYourReview',
  {
    defaultMessage: 'Needs your review',
  }
);

export const NEW_EVIDENCE_SINCE_CONCLUDED = i18n.translate(
  'xpack.cases.investigations.claims.newEvidenceSinceConcluded',
  {
    defaultMessage: 'New evidence since concluded',
  }
);

export const RAISED_AT = i18n.translate('xpack.cases.investigations.claims.raisedAt', {
  defaultMessage: 'Raised',
});

export const RAISED_BY_NAME = (name: string) =>
  i18n.translate('xpack.cases.investigations.claims.raisedByName', {
    defaultMessage: 'Raised by {name}',
    values: { name },
  });

export const LAST_CHANGED_BY = (name: string) =>
  i18n.translate('xpack.cases.investigations.claims.lastChangedBy', {
    defaultMessage: 'last changed by {name}',
    values: { name },
  });

export const CLOSED_READ_ONLY = i18n.translate('xpack.cases.investigations.claims.closedReadOnly', {
  defaultMessage:
    'This investigation is closed, so its claims are read only. Reopen it to change them.',
});

export const STALE_TITLE = (reason: string) =>
  i18n.translate('xpack.cases.investigations.claims.staleTitle', {
    defaultMessage: 'New evidence since this was concluded: {reason}',
    values: { reason },
  });

export const STALE_BODY = i18n.translate('xpack.cases.investigations.claims.staleBody', {
  defaultMessage: 'Check that the conclusion still holds.',
});

export const STILL_HOLDS = i18n.translate('xpack.cases.investigations.claims.stillHolds', {
  defaultMessage: 'Still holds',
});

export const STILL_HOLDS_DONE = (ref: string) =>
  i18n.translate('xpack.cases.investigations.claims.stillHoldsDone', {
    defaultMessage: '{ref} still holds.',
    values: { ref },
  });

export const RECHECK = i18n.translate('xpack.cases.investigations.claims.recheck', {
  defaultMessage: 'Re-check',
});

export const RECHECK_DONE = (ref: string) =>
  i18n.translate('xpack.cases.investigations.claims.recheckDone', {
    defaultMessage: '{ref} is open again.',
    values: { ref },
  });

export const REOPENED_AFTER_NEW_EVIDENCE = i18n.translate(
  'xpack.cases.investigations.claims.reopenedAfterNewEvidence',
  {
    defaultMessage: 'Reopened after new evidence arrived.',
  }
);

export const REVIEW_TITLE = (name: string) =>
  i18n.translate('xpack.cases.investigations.claims.reviewTitle', {
    defaultMessage: '{name} concluded this claim',
    values: { name },
  });

export const REVIEW_BODY = i18n.translate('xpack.cases.investigations.claims.reviewBody', {
  defaultMessage: 'Check the evidence and the reasoning, then accept it or change the status.',
});

export const ACCEPT_CONCLUSION = i18n.translate(
  'xpack.cases.investigations.claims.acceptConclusion',
  {
    defaultMessage: 'Accept',
  }
);

export const ACCEPTED = (ref: string) =>
  i18n.translate('xpack.cases.investigations.claims.accepted', {
    defaultMessage: 'Accepted. {ref} no longer needs review.',
    values: { ref },
  });

export const REOPEN = i18n.translate('xpack.cases.investigations.claims.reopen', {
  defaultMessage: 'Reopen',
});

export const REOPENED = (ref: string) =>
  i18n.translate('xpack.cases.investigations.claims.reopened', {
    defaultMessage: '{ref} is open again.',
    values: { ref },
  });

export const OPEN_REASONING = i18n.translate('xpack.cases.investigations.claims.openReasoning', {
  defaultMessage: 'Open reasoning',
});

export const CLAIM_SAVED = (ref: string) =>
  i18n.translate('xpack.cases.investigations.claims.claimSaved', {
    defaultMessage: 'Saved {ref}.',
    values: { ref },
  });

export const SECTION_QUESTION = i18n.translate(
  'xpack.cases.investigations.claims.sectionQuestion',
  {
    defaultMessage: 'Question',
  }
);

export const SECTION_GAPS = i18n.translate('xpack.cases.investigations.claims.sectionGaps', {
  defaultMessage: 'Gaps',
});

export const SECTION_SOURCE_MESSAGE = i18n.translate(
  'xpack.cases.investigations.claims.sectionSourceMessage',
  {
    defaultMessage: 'Source message',
  }
);

export const OPEN_CONVERSATION = i18n.translate(
  'xpack.cases.investigations.claims.openConversation',
  {
    defaultMessage: 'Open the conversation',
  }
);

export const SECTION_EVIDENCE = i18n.translate(
  'xpack.cases.investigations.claims.sectionEvidence',
  {
    defaultMessage: 'Evidence',
  }
);

export const SECTION_HISTORY = i18n.translate('xpack.cases.investigations.claims.sectionHistory', {
  defaultMessage: 'History',
});

export const SECTION_COMMENTS = i18n.translate(
  'xpack.cases.investigations.claims.sectionComments',
  {
    defaultMessage: 'Comments',
  }
);

export const FIELD_STATUS = i18n.translate('xpack.cases.investigations.claims.fieldStatus', {
  defaultMessage: 'Status',
});

export const FIELD_CONCLUSION = i18n.translate(
  'xpack.cases.investigations.claims.fieldConclusion',
  {
    defaultMessage: 'Conclusion',
  }
);

export const FIELD_NOTE = i18n.translate('xpack.cases.investigations.claims.fieldNote', {
  defaultMessage: 'Note',
});

export const FIELD_NOTE_OPEN = i18n.translate('xpack.cases.investigations.claims.fieldNoteOpen', {
  defaultMessage: 'Where this stands',
});

export const FIELD_NOTE_BLOCKED = i18n.translate(
  'xpack.cases.investigations.claims.fieldNoteBlocked',
  {
    defaultMessage: 'What is blocking it',
  }
);

export const FIELD_NOTE_REFUTED = i18n.translate(
  'xpack.cases.investigations.claims.fieldNoteRefuted',
  {
    defaultMessage: 'Why it was refuted',
  }
);

export const FIELD_REASONING = i18n.translate('xpack.cases.investigations.claims.fieldReasoning', {
  defaultMessage: 'Reasoning',
});

export const FIELD_CONFIDENCE = i18n.translate(
  'xpack.cases.investigations.claims.fieldConfidence',
  {
    defaultMessage: 'Confidence',
  }
);

export const HELP_CONCLUSION = i18n.translate('xpack.cases.investigations.claims.helpConclusion', {
  defaultMessage: 'State the conclusion in one sentence.',
});

export const HELP_CONCLUSION_OPTIONAL = i18n.translate(
  'xpack.cases.investigations.claims.helpConclusionOptional',
  {
    defaultMessage: 'Optional until the claim is supported or refuted.',
  }
);

export const HELP_REASONING = i18n.translate('xpack.cases.investigations.claims.helpReasoning', {
  defaultMessage: 'Why does the evidence lead to this? Markdown is supported.',
});

export const HELP_CONFIDENCE = i18n.translate('xpack.cases.investigations.claims.helpConfidence', {
  defaultMessage: 'From 0 to 100. Leave empty when not assessed.',
});

export const ERROR_CONCLUSION_REQUIRED = i18n.translate(
  'xpack.cases.investigations.claims.errorConclusionRequired',
  {
    defaultMessage: 'State the conclusion for a supported or refuted claim.',
  }
);

export const ERROR_NOTE_REQUIRED = i18n.translate(
  'xpack.cases.investigations.claims.errorNoteRequired',
  {
    defaultMessage: 'Say what is blocking this claim.',
  }
);

export const ERROR_CONFIDENCE_RANGE = i18n.translate(
  'xpack.cases.investigations.claims.errorConfidenceRange',
  {
    defaultMessage: 'Enter a number from 0 to 100.',
  }
);

export const NO_EVIDENCE_LINKED = i18n.translate(
  'xpack.cases.investigations.claims.noEvidenceLinked',
  {
    defaultMessage: 'No evidence linked. Link some so a reviewer can check this claim.',
  }
);

export const NO_EVIDENCE_LINKED_SHORT = i18n.translate(
  'xpack.cases.investigations.claims.noEvidenceLinkedShort',
  {
    defaultMessage: 'No evidence linked',
  }
);

export const EVIDENCE_COUNT = (count: number) =>
  i18n.translate('xpack.cases.investigations.claims.evidenceCount', {
    defaultMessage: '{count, plural, one {# evidence item} other {# evidence items}}',
    values: { count },
  });

export const UNKNOWN_EVIDENCE = i18n.translate(
  'xpack.cases.investigations.claims.unknownEvidence',
  {
    defaultMessage: 'Unavailable',
  }
);

export const LINK_PLACEHOLDER = i18n.translate(
  'xpack.cases.investigations.claims.linkPlaceholder',
  {
    defaultMessage: 'Search evidence to link',
  }
);

export const LINK_ARIA = i18n.translate('xpack.cases.investigations.claims.linkAria', {
  defaultMessage: 'Evidence to link to this claim',
});

export const EVIDENCE_LINKED = i18n.translate('xpack.cases.investigations.claims.evidenceLinked', {
  defaultMessage: 'Evidence linked.',
});

export const EVIDENCE_UNLINKED = i18n.translate(
  'xpack.cases.investigations.claims.evidenceUnlinked',
  {
    defaultMessage: 'Evidence unlinked.',
  }
);

export const HISTORY_ERROR = i18n.translate('xpack.cases.investigations.claims.historyError', {
  defaultMessage: 'Could not load the history',
});

export const NO_HISTORY = i18n.translate('xpack.cases.investigations.claims.noHistory', {
  defaultMessage: 'No changes recorded yet.',
});

export const COMMENTS_ERROR = i18n.translate('xpack.cases.investigations.claims.commentsError', {
  defaultMessage: 'Could not load the comments',
});

export const NO_COMMENTS = i18n.translate('xpack.cases.investigations.claims.noComments', {
  defaultMessage: 'No comments yet.',
});

export const COMMENT_ARIA = i18n.translate('xpack.cases.investigations.claims.commentAria', {
  defaultMessage: 'Write a comment',
});

export const COMMENT_PLACEHOLDER = i18n.translate(
  'xpack.cases.investigations.claims.commentPlaceholder',
  {
    defaultMessage: 'Add a comment. Markdown is supported.',
  }
);

export const CLAIMS_TITLE = i18n.translate('xpack.cases.investigations.claims.claimsTitle', {
  defaultMessage: 'Claims',
});

export const NEED_YOUR_REVIEW = (count: number) =>
  i18n.translate('xpack.cases.investigations.claims.needYourReview', {
    defaultMessage: '{count} need your review',
    values: { count },
  });

export const HOW_CLAIMS_WORK = i18n.translate('xpack.cases.investigations.claims.howClaimsWork', {
  defaultMessage: 'How claims work',
});

export const FILTER_LEGEND = i18n.translate('xpack.cases.investigations.claims.filterLegend', {
  defaultMessage: 'Claim status',
});

export const FILTER_ALL = i18n.translate('xpack.cases.investigations.claims.filterAll', {
  defaultMessage: 'All',
});

export const FILTER_LABEL = (label: string, count: number) =>
  i18n.translate('xpack.cases.investigations.claims.filterLabel', {
    defaultMessage: '{label} {count}',
    values: { label, count },
  });

export const CLAIMS_LOAD_ERROR = i18n.translate(
  'xpack.cases.investigations.claims.claimsLoadError',
  {
    defaultMessage: 'Could not load the claims',
  }
);

export const NO_CLAIMS = i18n.translate('xpack.cases.investigations.claims.noClaims', {
  defaultMessage: 'No claims yet. Ask a question or state a claim below.',
});

export const NO_CLAIMS_WITH_STATUS = i18n.translate(
  'xpack.cases.investigations.claims.noClaimsWithStatus',
  {
    defaultMessage: 'No claims with this status.',
  }
);

export const SHOWING_FIRST = (shown: number, total: number) =>
  i18n.translate('xpack.cases.investigations.claims.showingFirst', {
    defaultMessage:
      'Showing the first {shown} of {total} claims. Filter by status to narrow the list.',
    values: { shown, total },
  });

export const NEEDS_EVIDENCE = i18n.translate('xpack.cases.investigations.claims.needsEvidence', {
  defaultMessage: 'Needs evidence',
});

export const FROM_MESSAGE = i18n.translate('xpack.cases.investigations.claims.fromMessage', {
  defaultMessage: 'From message',
});

export const OPEN_CLAIM_ARIA = (ref: string) =>
  i18n.translate('xpack.cases.investigations.claims.openClaimAria', {
    defaultMessage: 'Open claim {ref}',
    values: { ref },
  });

export const EXPLAIN_AGENT_TITLE = (agent: string) =>
  i18n.translate('xpack.cases.investigations.claims.explainAgentTitle', {
    defaultMessage: '{agent} populates claims',
    values: { agent },
  });

export const EXPLAIN_PEOPLE_TITLE = i18n.translate(
  'xpack.cases.investigations.claims.explainPeopleTitle',
  {
    defaultMessage: 'You populate claims',
  }
);

export const EXPLAIN_LIFECYCLE = i18n.translate(
  'xpack.cases.investigations.claims.explainLifecycle',
  {
    defaultMessage: 'Lifecycle',
  }
);

export const EXPLAIN_OPEN_BLOCKED = i18n.translate(
  'xpack.cases.investigations.claims.explainOpenBlocked',
  {
    defaultMessage: 'Open and Blocked can switch back and forth.',
  }
);

export const OR = i18n.translate('xpack.cases.investigations.claims.or', {
  defaultMessage: 'or',
});

export const START_AS = i18n.translate('xpack.cases.investigations.claims.startAs', {
  defaultMessage: 'Start as',
});

export const START_HINT_OPEN = i18n.translate('xpack.cases.investigations.claims.startHintOpen', {
  defaultMessage: 'Open claims wait for evidence. Link evidence, then mark them supported.',
});

export const START_HINT_SUPPORTED = i18n.translate(
  'xpack.cases.investigations.claims.startHintSupported',
  {
    defaultMessage:
      'A supported claim without evidence is flagged as needing evidence until you link some.',
  }
);

export const NEW_CLAIM_LABEL = i18n.translate('xpack.cases.investigations.claims.newClaimLabel', {
  defaultMessage: 'Ask a question or state a claim',
});

export const NEW_CLAIM_PLACEHOLDER = i18n.translate(
  'xpack.cases.investigations.claims.newClaimPlaceholder',
  {
    defaultMessage: 'Did the host contact an external address?',
  }
);

export const NEW_CLAIM_REFS_LABEL = i18n.translate(
  'xpack.cases.investigations.claims.newClaimRefsLabel',
  {
    defaultMessage: 'Evidence refs (optional)',
  }
);

export const NEW_CLAIM_REFS_PLACEHOLDER = i18n.translate(
  'xpack.cases.investigations.claims.newClaimRefsPlaceholder',
  {
    defaultMessage: 'E3, E7',
  }
);

export const NEW_CLAIM_CLOSED = i18n.translate('xpack.cases.investigations.claims.newClaimClosed', {
  defaultMessage: 'This investigation is closed. Reopen it to add claims.',
});

export const ERROR_QUESTION_REQUIRED = i18n.translate(
  'xpack.cases.investigations.claims.errorQuestionRequired',
  {
    defaultMessage: 'Enter a question or a statement.',
  }
);

export const ERROR_SUPPORTED_NEEDS_STATEMENT = i18n.translate(
  'xpack.cases.investigations.claims.errorSupportedNeedsStatement',
  {
    defaultMessage:
      'A supported claim needs a conclusion. State it as a sentence, or start the claim as Open.',
  }
);

export const ERROR_REFS_FORMAT = (refs: string) =>
  i18n.translate('xpack.cases.investigations.claims.errorRefsFormat', {
    defaultMessage: 'Evidence refs look like E12. Check: {refs}',
    values: { refs },
  });

export const ERROR_REFS_UNKNOWN = (refs: string) =>
  i18n.translate('xpack.cases.investigations.claims.errorRefsUnknown', {
    defaultMessage: 'No evidence with these refs in this investigation: {refs}',
    values: { refs },
  });

export const ERROR_REFS_LOOKUP = i18n.translate(
  'xpack.cases.investigations.claims.errorRefsLookup',
  {
    defaultMessage: 'Could not check the evidence refs. Try again.',
  }
);

export const CLAIM_ADDED = (ref: string) =>
  i18n.translate('xpack.cases.investigations.claims.claimAdded', {
    defaultMessage: 'Added {ref}.',
    values: { ref },
  });

export const CLAIM_ADDED_GENERIC = i18n.translate(
  'xpack.cases.investigations.claims.claimAddedGeneric',
  {
    defaultMessage: 'Claim added.',
  }
);

export const ASSERTED_BY = i18n.translate('xpack.cases.investigations.claims.assertedBy', {
  defaultMessage: 'Asserted by',
});

export const CONFIDENCE = i18n.translate('xpack.cases.investigations.claims.confidence', {
  defaultMessage: 'Confidence',
});

export const ARGUMENT_VIEW_LEGEND = i18n.translate(
  'xpack.cases.investigations.claims.argumentViewLegend',
  {
    defaultMessage: 'Argument view',
  }
);

export const VIEW_CHAIN = i18n.translate('xpack.cases.investigations.claims.viewChain', {
  defaultMessage: 'Chain',
});

export const VIEW_MAP = i18n.translate('xpack.cases.investigations.claims.viewMap', {
  defaultMessage: 'Map',
});

export const VIEW_BALANCE = i18n.translate('xpack.cases.investigations.claims.viewBalance', {
  defaultMessage: 'Balance',
});

export const HELP_CHAIN = i18n.translate('xpack.cases.investigations.claims.helpChain', {
  defaultMessage: 'Read top to bottom. Each step turns an observation into a conclusion.',
});

export const HELP_MAP = i18n.translate('xpack.cases.investigations.claims.helpMap', {
  defaultMessage:
    'Evidence supports the claim through a rule. Rebuttals are the strongest reasons it could be wrong.',
});

export const HELP_BALANCE = i18n.translate('xpack.cases.investigations.claims.helpBalance', {
  defaultMessage:
    'Evidence weighed on both sides, plus what is missing. Dots show how much each item counts.',
});

export const WHAT_WOULD_CHANGE_THIS = i18n.translate(
  'xpack.cases.investigations.claims.whatWouldChangeThis',
  {
    defaultMessage: 'What would change this',
  }
);

export const WEIGHT_ARIA = (weight: number) =>
  i18n.translate('xpack.cases.investigations.claims.weightAria', {
    defaultMessage: 'Weight {weight} of 3',
    values: { weight },
  });

export const REBUTTAL_RULED_OUT = i18n.translate(
  'xpack.cases.investigations.claims.rebuttalRuledOut',
  {
    defaultMessage: 'Ruled out',
  }
);

export const REBUTTAL_WEAKENED = i18n.translate(
  'xpack.cases.investigations.claims.rebuttalWeakened',
  {
    defaultMessage: 'Weakened, not ruled out',
  }
);

export const REBUTTAL_OPEN = i18n.translate('xpack.cases.investigations.claims.rebuttalOpen', {
  defaultMessage: 'Open',
});

export const COUNTERARGUMENTS = i18n.translate(
  'xpack.cases.investigations.claims.counterarguments',
  {
    defaultMessage: 'Counterarguments considered',
  }
);

export const UNLESS = (text: string) =>
  i18n.translate('xpack.cases.investigations.claims.unless', {
    defaultMessage: 'Unless: {text}',
    values: { text },
  });

export const NO_REASONING_TITLE = i18n.translate(
  'xpack.cases.investigations.claims.noReasoningTitle',
  {
    defaultMessage: 'No reasoning recorded',
  }
);

export const NO_REASONING_BODY = (count: number) =>
  i18n.translate('xpack.cases.investigations.claims.noReasoningBody', {
    defaultMessage:
      'The author linked {count, plural, one {# evidence item} other {# evidence items}} but did not explain how they lead to the claim.',
    values: { count },
  });

export const STEP_ARIA = (position: number) =>
  i18n.translate('xpack.cases.investigations.claims.stepAria', {
    defaultMessage: 'Step {position}',
    values: { position },
  });

export const OBSERVED = i18n.translate('xpack.cases.investigations.claims.observed', {
  defaultMessage: 'Observed',
});

export const SO = i18n.translate('xpack.cases.investigations.claims.so', {
  defaultMessage: 'So',
});

export const BECAUSE_RULE = i18n.translate('xpack.cases.investigations.claims.becauseRule', {
  defaultMessage: 'Because (the rule that links the steps)',
});

export const CURRENT_POSITION = i18n.translate(
  'xpack.cases.investigations.claims.currentPosition',
  {
    defaultMessage: 'Current position, not a conclusion',
  }
);

export const CONCLUSION = i18n.translate('xpack.cases.investigations.claims.conclusion', {
  defaultMessage: 'Conclusion',
});

export const COULD_NOT_ESTABLISH = i18n.translate(
  'xpack.cases.investigations.claims.couldNotEstablish',
  {
    defaultMessage: 'Could not establish',
  }
);

export const GROUNDS = i18n.translate('xpack.cases.investigations.claims.grounds', {
  defaultMessage: 'Grounds (evidence)',
});

export const NO_GROUNDS = i18n.translate('xpack.cases.investigations.claims.noGrounds', {
  defaultMessage: 'No evidence is cited.',
});

export const CLAIM = i18n.translate('xpack.cases.investigations.claims.claim', {
  defaultMessage: 'Claim',
});

export const PROBABLY = (confidence: number) =>
  i18n.translate('xpack.cases.investigations.claims.probably', {
    defaultMessage: 'Probably, {confidence}%',
    values: { confidence },
  });

export const BECAUSE_WARRANT = i18n.translate('xpack.cases.investigations.claims.becauseWarrant', {
  defaultMessage: 'Because (warrant)',
});

export const NO_WARRANT = i18n.translate('xpack.cases.investigations.claims.noWarrant', {
  defaultMessage: 'No rule links these grounds to the claim yet.',
});

export const UNLESS_REBUTTALS = i18n.translate(
  'xpack.cases.investigations.claims.unlessRebuttals',
  {
    defaultMessage: 'Unless (rebuttals)',
  }
);

export const NO_REBUTTALS = i18n.translate('xpack.cases.investigations.claims.noRebuttals', {
  defaultMessage: 'No counterarguments were considered.',
});

export const BALANCE_ARIA = (support: number, counter: number, unknown: number) =>
  i18n.translate('xpack.cases.investigations.claims.balanceAria', {
    defaultMessage: 'Support {support}, counter {counter}, unknown {unknown}',
    values: { support, counter, unknown },
  });

export const BALANCE_SUPPORTS = (weight: number) =>
  i18n.translate('xpack.cases.investigations.claims.balanceSupports', {
    defaultMessage: 'Supports {weight}',
    values: { weight },
  });

export const BALANCE_COUNTERS = (weight: number) =>
  i18n.translate('xpack.cases.investigations.claims.balanceCounters', {
    defaultMessage: 'Counters {weight}',
    values: { weight },
  });

export const BALANCE_UNKNOWN = (weight: number) =>
  i18n.translate('xpack.cases.investigations.claims.balanceUnknown', {
    defaultMessage: 'Unknown {weight}',
    values: { weight },
  });

export const SUPPORTS_THE_CLAIM = i18n.translate(
  'xpack.cases.investigations.claims.supportsTheClaim',
  {
    defaultMessage: 'Supports the claim',
  }
);

export const COUNTERS_THE_CLAIM = i18n.translate(
  'xpack.cases.investigations.claims.countersTheClaim',
  {
    defaultMessage: 'Counters the claim',
  }
);

export const UNKNOWN_COULD_CHANGE = i18n.translate(
  'xpack.cases.investigations.claims.unknownCouldChange',
  {
    defaultMessage: 'Unknown, could change the balance',
  }
);

export const NO_SUPPORT = i18n.translate('xpack.cases.investigations.claims.noSupport', {
  defaultMessage: 'No supporting evidence.',
});

export const NO_COUNTER_EVIDENCE = i18n.translate(
  'xpack.cases.investigations.claims.noCounterEvidence',
  {
    defaultMessage: 'No counter-evidence found.',
  }
);

export const NOTHING_MISSING = i18n.translate('xpack.cases.investigations.claims.nothingMissing', {
  defaultMessage: 'Nothing missing.',
});

export const NOTE_TITLE = {
  open: FIELD_NOTE_OPEN,
  supported: FIELD_NOTE,
  blocked: FIELD_NOTE_BLOCKED,
  refuted: FIELD_NOTE_REFUTED,
} as const;

export const EXPLAIN_AGENT_STEPS = [
  i18n.translate('xpack.cases.investigations.claims.explainAgentStep1', {
    defaultMessage: 'Opens claims from the alert and from what it finds. They start Open.',
  }),
  i18n.translate('xpack.cases.investigations.claims.explainAgentStep2', {
    defaultMessage: 'Runs tests and adds evidence. Each item names the worker that added it.',
  }),
  i18n.translate('xpack.cases.investigations.claims.explainAgentStep3', {
    defaultMessage:
      'Writes the reasoning and sets the status with a confidence. The claim then shows Needs your review.',
  }),
  i18n.translate('xpack.cases.investigations.claims.explainAgentStep4', {
    defaultMessage: 'Sets Blocked and says why when it cannot go further.',
  }),
] as const;

export const EXPLAIN_PEOPLE_STEPS = [
  i18n.translate('xpack.cases.investigations.claims.explainPeopleStep1', {
    defaultMessage: 'Ask a question or state a claim yourself.',
  }),
  i18n.translate('xpack.cases.investigations.claims.explainPeopleStep2', {
    defaultMessage: 'Link evidence and write the reasoning, or accept the one an agent wrote.',
  }),
  i18n.translate('xpack.cases.investigations.claims.explainPeopleStep3', {
    defaultMessage: 'Review agent conclusions: accept them, or change the status.',
  }),
  i18n.translate('xpack.cases.investigations.claims.explainPeopleStep4', {
    defaultMessage: 'Your changes win and stay attributed to you.',
  }),
] as const;
