/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const THE_AGENT = i18n.translate('xpack.cases.investigations.overview.theAgent', {
  defaultMessage: 'The agent',
});

export const WHERE_THIS_STANDS = i18n.translate(
  'xpack.cases.investigations.overview.whereThisStands',
  {
    defaultMessage: 'Where this stands',
  }
);

export const LAST_ACTIVITY = i18n.translate('xpack.cases.investigations.overview.lastActivity', {
  defaultMessage: 'Last activity',
});

export const AGENT_SUMMARY = i18n.translate('xpack.cases.investigations.overview.agentSummary', {
  defaultMessage: 'Agent summary',
});

export const SUMMARY_EMPTY_AGENT = i18n.translate(
  'xpack.cases.investigations.overview.summaryEmptyAgent',
  {
    defaultMessage:
      'The agent has not written a summary yet. The description is in the Context panel.',
  }
);

export const SUMMARY_EMPTY_NO_AGENT = i18n.translate(
  'xpack.cases.investigations.overview.summaryEmptyNoAgent',
  {
    defaultMessage:
      'This investigation has no agent, so there is no summary. The description is in the Context panel.',
  }
);

export const ACTIVITY_LINK = i18n.translate('xpack.cases.investigations.overview.activityLink', {
  defaultMessage: 'Activity',
});

export const DONE_SO_FAR = i18n.translate('xpack.cases.investigations.overview.doneSoFar', {
  defaultMessage: 'Done so far',
});

export const DONE_SUMMARY = (
  evidence: number,
  claims: number,
  supported: number,
  open: number,
  blocked: number,
  refuted: number
) =>
  i18n.translate('xpack.cases.investigations.overview.doneSummary', {
    defaultMessage:
      '{evidence, plural, one {# evidence item} other {# evidence items}}. {claims, plural, one {# claim} other {# claims}}: {supported} supported, {open} open, {blocked} blocked{refuted, plural, =0 {} other {, # refuted}}.',
    values: { evidence, claims, supported, open, blocked, refuted },
  });

export const WAITING_ON_YOU = i18n.translate('xpack.cases.investigations.overview.waitingOnYou', {
  defaultMessage: 'Waiting on you',
});

export const WAITING_PROPOSALS = (count: number, disruptive: number) =>
  i18n.translate('xpack.cases.investigations.overview.waitingProposals', {
    defaultMessage:
      '{count, plural, one {# proposed action} other {# proposed actions}}{disruptive, plural, =0 {} other {, # disruptive}}',
    values: { count, disruptive },
  });

export const WAITING_NO_PROPOSALS = i18n.translate(
  'xpack.cases.investigations.overview.waitingNoProposals',
  {
    defaultMessage: 'No proposed actions',
  }
);

export const WAITING_REVIEW = (count: number) =>
  i18n.translate('xpack.cases.investigations.overview.waitingReview', {
    defaultMessage:
      '{count, plural, one {# agent conclusion} other {# agent conclusions}} to review',
    values: { count },
  });

export const SCOPE = i18n.translate('xpack.cases.investigations.overview.scope', {
  defaultMessage: 'Scope',
});

export const SCOPE_SUMMARY = (hosts: number, suspected: number, identities: number) =>
  i18n.translate('xpack.cases.investigations.overview.scopeSummary', {
    defaultMessage:
      '{hosts, plural, one {# host} other {# hosts}}{suspected, plural, =0 {} other { and # suspected}}, {identities, plural, one {# identity} other {# identities}}.',
    values: { hosts, suspected, identities },
  });

export const HIGHEST_CRITICALITY = (criticality: string, name: string, isSuspected: boolean) =>
  i18n.translate('xpack.cases.investigations.overview.highestCriticality', {
    defaultMessage:
      'Highest criticality in range: {criticality} ({name}{isSuspected, select, true {, suspected} other {}}).',
    values: { criticality, name, isSuspected },
  });

export const HIGHEST_CRITICALITY_NONE = i18n.translate(
  'xpack.cases.investigations.overview.highestCriticalityNone',
  {
    defaultMessage: 'Highest criticality in range: none.',
  }
);

export const SCOPE_GRAPH = i18n.translate('xpack.cases.investigations.overview.scopeGraph', {
  defaultMessage: 'Scope graph',
});

export const PROCEDURE = i18n.translate('xpack.cases.investigations.overview.procedure', {
  defaultMessage: 'Procedure',
});

export const PROCEDURE_SUMMARY = (type: string, done: number, total: number, left: number) =>
  i18n.translate('xpack.cases.investigations.overview.procedureSummary', {
    defaultMessage:
      '{type}: {done} of {total} tasks done{left, plural, =0 {. All required tasks are done} other {. # required before close}}.',
    values: { type, done, total, left },
  });

export const PROCEDURE_NONE = (type: string) =>
  i18n.translate('xpack.cases.investigations.overview.procedureNone', {
    defaultMessage: '{type}: no task list applied.',
    values: { type },
  });

export const PROCEDURE_LINK = i18n.translate('xpack.cases.investigations.overview.procedureLink', {
  defaultMessage: 'Procedure',
});

export const RUNNING_NOW = i18n.translate('xpack.cases.investigations.overview.runningNow', {
  defaultMessage: 'Running now',
});

export const RUNNING_NO_AGENTS = i18n.translate(
  'xpack.cases.investigations.overview.runningNoAgents',
  {
    defaultMessage: 'No agents are enabled. People do all of the work here.',
  }
);

export const RUNNING_NOTHING_CLOSED = i18n.translate(
  'xpack.cases.investigations.overview.runningNothingClosed',
  {
    defaultMessage: 'Nothing is running. The investigation is closed.',
  }
);

export const RUNNING_WORKING = (agent: string, message: string) =>
  i18n.translate('xpack.cases.investigations.overview.runningWorking', {
    defaultMessage: '{agent} is working: {message}',
    values: { agent, message },
  });

export const RUNNING_IDLE = (agent: string) =>
  i18n.translate('xpack.cases.investigations.overview.runningIdle', {
    defaultMessage: 'Nothing is running. {agent} is idle.',
    values: { agent },
  });

export const NEXT = i18n.translate('xpack.cases.investigations.overview.next', {
  defaultMessage: 'Next',
});

export const NEXT_TAKE_OWNERSHIP = i18n.translate(
  'xpack.cases.investigations.overview.nextTakeOwnership',
  {
    defaultMessage: 'Take ownership',
  }
);

export const NEXT_REVIEW = (count: number) =>
  i18n.translate('xpack.cases.investigations.overview.nextReview', {
    defaultMessage: 'Review {count, plural, one {# agent conclusion} other {# agent conclusions}}',
    values: { count },
  });

export const NEXT_DECIDE_DISRUPTIVE = (count: number) =>
  i18n.translate('xpack.cases.investigations.overview.nextDecideDisruptive', {
    defaultMessage:
      'Decide on {count, plural, one {# disruptive action} other {# disruptive actions}}',
    values: { count },
  });

export const NEXT_DECIDE_PROPOSALS = (count: number) =>
  i18n.translate('xpack.cases.investigations.overview.nextDecideProposals', {
    defaultMessage: 'Decide on {count, plural, one {# proposal} other {# proposals}}',
    values: { count },
  });

export const NEXT_SETTLE = (count: number) =>
  i18n.translate('xpack.cases.investigations.overview.nextSettle', {
    defaultMessage:
      'Settle {count, plural, one {# open or blocked claim} other {# open or blocked claims}}',
    values: { count },
  });

export const NEXT_FINISH_TASKS = (count: number) =>
  i18n.translate('xpack.cases.investigations.overview.nextFinishTasks', {
    defaultMessage:
      'Finish {count, plural, one {# required procedure task} other {# required procedure tasks}}',
    values: { count },
  });

export const NEXT_REOPEN = i18n.translate('xpack.cases.investigations.overview.nextReopen', {
  defaultMessage: 'Reopen if new activity appears',
});

export const NEXT_APPLY_PROCEDURE = i18n.translate(
  'xpack.cases.investigations.overview.nextApplyProcedure',
  {
    defaultMessage: 'Apply a task list, or close the investigation with a structured outcome',
  }
);

export const NEXT_CLOSE = i18n.translate('xpack.cases.investigations.overview.nextClose', {
  defaultMessage: 'Close the investigation with a structured outcome',
});

export const CLOSED_AS = (verdict: string) =>
  i18n.translate('xpack.cases.investigations.overview.closedAs', {
    defaultMessage: 'Closed as {verdict}',
    values: { verdict },
  });

export const CLOSED_REASON = (reason: string, rootCause: string) =>
  i18n.translate('xpack.cases.investigations.overview.closedReason', {
    defaultMessage: '{reason}. Root cause: {rootCause}.',
    values: { reason, rootCause },
  });

export const CLOSED_PRESERVED = i18n.translate(
  'xpack.cases.investigations.overview.closedPreserved',
  {
    defaultMessage: 'The record is preserved as it was when it closed.',
  }
);

export const GENERATE_REPORT = i18n.translate(
  'xpack.cases.investigations.overview.generateReport',
  {
    defaultMessage: 'Generate report',
  }
);

export const REOPEN = i18n.translate('xpack.cases.investigations.overview.reopen', {
  defaultMessage: 'Reopen',
});

export const SINCE_LAST_HANDOFF = i18n.translate(
  'xpack.cases.investigations.overview.sinceLastHandoff',
  {
    defaultMessage: 'Since the last handoff',
  }
);

export const HANDED_OFF = i18n.translate('xpack.cases.investigations.overview.handedOff', {
  defaultMessage: 'Handed off',
});

export const HANDED_OFF_BY = (name: string) =>
  i18n.translate('xpack.cases.investigations.overview.handedOffBy', {
    defaultMessage: 'Handed off by {name}',
    values: { name },
  });

export const OPEN = i18n.translate('xpack.cases.investigations.overview.open', {
  defaultMessage: 'Open',
});

export const VERDICT = i18n.translate('xpack.cases.investigations.overview.verdict', {
  defaultMessage: 'Verdict',
});

export const VERDICT_SUPERSEDED = i18n.translate(
  'xpack.cases.investigations.overview.verdictSuperseded',
  {
    defaultMessage: 'Verdict (superseded)',
  }
);

export const VERDICT_FROM_AGENT = i18n.translate(
  'xpack.cases.investigations.overview.verdictFromAgent',
  {
    defaultMessage: 'Verdict, from the agent',
  }
);

export const YOUR_DETERMINATION = i18n.translate(
  'xpack.cases.investigations.overview.yourDetermination',
  {
    defaultMessage: 'Your verdict',
  }
);

export const FINAL_VERDICT = i18n.translate('xpack.cases.investigations.overview.finalVerdict', {
  defaultMessage: 'Final verdict',
});

export const NOT_SET = i18n.translate('xpack.cases.investigations.overview.notSet', {
  defaultMessage: 'Not set',
});

export const NO_AGENT_ASSESSMENT = i18n.translate(
  'xpack.cases.investigations.overview.noAgentAssessment',
  {
    defaultMessage:
      'No agent has assessed this investigation. Decide from the evidence and the claims.',
  }
);

export const NO_VERDICT_CLOSED = i18n.translate(
  'xpack.cases.investigations.overview.noVerdictClosed',
  {
    defaultMessage: 'This investigation was closed without a verdict.',
  }
);

export const SET_YOUR_DETERMINATION = i18n.translate(
  'xpack.cases.investigations.overview.setYourDetermination',
  {
    defaultMessage: 'Set your verdict',
  }
);

export const EDIT_YOUR_DETERMINATION = i18n.translate(
  'xpack.cases.investigations.overview.editYourDetermination',
  {
    defaultMessage: 'Edit your verdict',
  }
);

export const EDIT = i18n.translate('xpack.cases.investigations.overview.edit', {
  defaultMessage: 'Edit',
});

export const REPLACES_AGENT_VERDICT = i18n.translate(
  'xpack.cases.investigations.overview.replacesAgentVerdict',
  {
    defaultMessage: 'Yours replaces the AI verdict',
  }
);

export const CONFIDENCE = i18n.translate('xpack.cases.investigations.overview.confidence', {
  defaultMessage: 'confidence',
});

export const CONFIDENCE_ARIA = (value: number) =>
  i18n.translate('xpack.cases.investigations.overview.confidenceAria', {
    defaultMessage: 'Confidence {value}%',
    values: { value },
  });

export const ALTERNATIVES_CONSIDERED = i18n.translate(
  'xpack.cases.investigations.overview.alternativesConsidered',
  {
    defaultMessage: 'Alternatives considered',
  }
);

export const ALTERNATIVE_RULED_OUT = i18n.translate(
  'xpack.cases.investigations.overview.alternativeRuledOut',
  {
    defaultMessage: 'Ruled out',
  }
);

export const ALTERNATIVE_WEAKENED = i18n.translate(
  'xpack.cases.investigations.overview.alternativeWeakened',
  {
    defaultMessage: 'Weakened',
  }
);

export const ALTERNATIVE_OPEN = i18n.translate(
  'xpack.cases.investigations.overview.alternativeOpen',
  {
    defaultMessage: 'Open',
  }
);

export const CURRENT_VERDICT = i18n.translate(
  'xpack.cases.investigations.overview.currentVerdict',
  {
    defaultMessage: 'Current verdict',
  }
);

export const SET_BY = (name: string) =>
  i18n.translate('xpack.cases.investigations.overview.setBy', {
    defaultMessage: 'Set by {name}',
    values: { name },
  });

export const REVERT_TO_AGENT = i18n.translate('xpack.cases.investigations.overview.revertToAgent', {
  defaultMessage: 'Revert to AI verdict',
});

export const REVERT_TITLE = i18n.translate('xpack.cases.investigations.overview.revertTitle', {
  defaultMessage: 'Revert to the AI verdict?',
});

export const REVERT_BODY_AGENT = i18n.translate(
  'xpack.cases.investigations.overview.revertBodyAgent',
  {
    defaultMessage: 'Your verdict is removed and the AI verdict becomes the current verdict again.',
  }
);

export const REVERT_BODY_NONE = i18n.translate(
  'xpack.cases.investigations.overview.revertBodyNone',
  {
    defaultMessage:
      'Your verdict is removed. No agent assessed this investigation, so the verdict goes back to Not set.',
  }
);

export const REVERT_CONFIRM = i18n.translate('xpack.cases.investigations.overview.revertConfirm', {
  defaultMessage: 'Revert',
});

export const REVERTED = i18n.translate('xpack.cases.investigations.overview.reverted', {
  defaultMessage: 'Reverted. The AI verdict is current again.',
});

export const SUPERSEDED = i18n.translate('xpack.cases.investigations.overview.superseded', {
  defaultMessage: 'Superseded',
});

export const SUPERSEDED_LINE = (label: string, confidence: number) =>
  i18n.translate('xpack.cases.investigations.overview.supersededLine', {
    defaultMessage: 'Agent analysis, kept on record: {label} ({confidence}%).',
    values: { label, confidence },
  });

export const DIFFERS = i18n.translate('xpack.cases.investigations.overview.differs', {
  defaultMessage: 'It differs from your verdict.',
});

export const SUPERSEDED_NOTICE = (verdict: string) =>
  i18n.translate('xpack.cases.investigations.overview.supersededNotice', {
    defaultMessage: 'Superseded by the human verdict: {verdict}. This analysis stays on record.',
    values: { verdict },
  });

export const VERDICT_FROM_CLOSE = i18n.translate(
  'xpack.cases.investigations.overview.verdictFromClose',
  {
    defaultMessage: 'Set by the closing outcome. No separate verdict was recorded.',
  }
);

/* Item 16 Timings */
export const TIMINGS = i18n.translate('xpack.cases.investigations.overview.timings', {
  defaultMessage: 'Timings',
});

export const TIME_TO_FIRST_RESPONSE = i18n.translate(
  'xpack.cases.investigations.overview.timeToFirstResponse',
  {
    defaultMessage: 'Time to first response',
  }
);

export const TIME_IN_PROGRESS = i18n.translate(
  'xpack.cases.investigations.overview.timeInProgress',
  {
    defaultMessage: 'Time in progress',
  }
);

export const TIME_TO_CLOSE = i18n.translate('xpack.cases.investigations.overview.timeToClose', {
  defaultMessage: 'Time to close',
});

export const TIMING_NOT_YET = i18n.translate('xpack.cases.investigations.overview.timingNotYet', {
  defaultMessage: 'Not yet',
});

export const TIMINGS_UNAVAILABLE = i18n.translate(
  'xpack.cases.investigations.overview.timingsUnavailable',
  {
    defaultMessage: 'Timings are not available right now.',
  }
);

export const TIMINGS_EXCLUDES_PAUSED = (duration: string) =>
  i18n.translate('xpack.cases.investigations.overview.timingsExcludesPaused', {
    defaultMessage: 'excludes {duration} paused',
    values: { duration },
  });
