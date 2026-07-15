/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const VIEW_INVESTIGATIONS = i18n.translate('xpack.inbox.watches.card.viewInvestigations', {
  defaultMessage: 'View investigation queue',
});

export const OPEN_WATCH_SETTINGS = i18n.translate('xpack.inbox.watches.card.openSettings', {
  defaultMessage: 'Open watch settings',
});

export const PAGE_TITLE = i18n.translate('xpack.inbox.watches.pageTitle', {
  defaultMessage: 'Watches',
});

export const PAGE_SUBTITLE = i18n.translate('xpack.inbox.watches.pageSubtitle', {
  defaultMessage: 'Coverage, autonomy & schedule',
});

export const COVERAGE_TITLE = i18n.translate('xpack.inbox.watches.coverage.title', {
  defaultMessage: 'Coverage',
});

export const COVERAGE_SUBTITLE = i18n.translate('xpack.inbox.watches.coverage.subtitle', {
  defaultMessage: "who's on duty across 24 hours",
});

export const onDutyNowLabel = (onDuty: number, total: number) =>
  i18n.translate('xpack.inbox.watches.coverage.onDutyNow', {
    defaultMessage: '{onDuty} of {total} on duty now',
    values: { onDuty, total },
  });

export const WATCHES_SECTION_TITLE = i18n.translate('xpack.inbox.watches.sectionTitle', {
  defaultMessage: 'Watches',
});

export const watchesSectionCount = (active: number, drafts: number, paused: number) => {
  const bits: string[] = [
    i18n.translate('xpack.inbox.watches.count.active', {
      defaultMessage: '{active} active',
      values: { active },
    }),
  ];
  if (paused > 0) {
    bits.push(
      i18n.translate('xpack.inbox.watches.count.paused', {
        defaultMessage: '{paused} paused',
        values: { paused },
      })
    );
  }
  if (drafts > 0) {
    bits.push(
      i18n.translate('xpack.inbox.watches.count.draft', {
        defaultMessage: '{drafts} draft',
        values: { drafts },
      })
    );
  }
  return i18n.translate('xpack.inbox.watches.sectionCount', {
    defaultMessage: '{bits} — click a card to configure',
    values: { bits: bits.join(' · ') },
  });
};

export const ALWAYS_ON = i18n.translate('xpack.inbox.watches.schedule.alwaysOn', {
  defaultMessage: 'Always on',
});

export const ON_DEMAND = i18n.translate('xpack.inbox.watches.schedule.onDemand', {
  defaultMessage: 'On demand',
});

export const TIME_BASED = i18n.translate('xpack.inbox.watches.schedule.timeBased', {
  defaultMessage: 'Time-based',
});

export const DRAFT_BADGE = i18n.translate('xpack.inbox.watches.badge.draft', {
  defaultMessage: 'Draft',
});

export const ACTIVE_BADGE = i18n.translate('xpack.inbox.watches.badge.active', {
  defaultMessage: 'Active',
});

export const PAUSED_BADGE = i18n.translate('xpack.inbox.watches.badge.paused', {
  defaultMessage: 'Paused',
});

export const lastRunLabel = (lastRun: string) =>
  i18n.translate('xpack.inbox.watches.card.lastRun', {
    defaultMessage: 'Last run {lastRun}',
    values: { lastRun },
  });

export const NEVER_RUN = i18n.translate('xpack.inbox.watches.card.neverRun', {
  defaultMessage: 'Never run',
});

export const RUNS_7D = i18n.translate('xpack.inbox.watches.card.runs7d', {
  defaultMessage: 'Runs · 7d',
});

export const ACCEPTED = i18n.translate('xpack.inbox.watches.card.accepted', {
  defaultMessage: 'Accepted',
});

export const TIME_SAVED = i18n.translate('xpack.inbox.watches.card.timeSaved', {
  defaultMessage: 'Time saved',
});

export const AUTONOMY = i18n.translate('xpack.inbox.watches.card.autonomy', {
  defaultMessage: 'Autonomy',
});

export const DATA_SCOPE = i18n.translate('xpack.inbox.watches.card.dataScope', {
  defaultMessage: 'Data scope',
});

export const NEW_WATCH_TITLE = i18n.translate('xpack.inbox.watches.newWatch.title', {
  defaultMessage: 'New watch',
});

export const NEW_WATCH_DESCRIPTION = i18n.translate('xpack.inbox.watches.newWatch.description', {
  defaultMessage: 'Create a custom tagged workflow',
});

export const NEW_CUSTOM_WATCH_NAME = i18n.translate('xpack.inbox.watches.newWatch.defaultName', {
  defaultMessage: 'Custom watch',
});

export const NEW_CUSTOM_WATCH_DESCRIPTION = i18n.translate(
  'xpack.inbox.watches.newWatch.defaultDescription',
  {
    defaultMessage: 'Custom watch scaffold — edit the workflow YAML to add agent skills.',
  }
);

export const CUSTOM_WATCH_CREATED = i18n.translate('xpack.inbox.watches.newWatch.created', {
  defaultMessage: 'Custom watch created',
});

export const CUSTOM_WATCH_CREATE_FAILED = i18n.translate(
  'xpack.inbox.watches.newWatch.createFailed',
  {
    defaultMessage: 'Failed to create custom watch',
  }
);

export const LOADING_WATCHES = i18n.translate('xpack.inbox.watches.loading', {
  defaultMessage: 'Loading watches…',
});

export const LOAD_ERROR_TITLE = i18n.translate('xpack.inbox.watches.loadError.title', {
  defaultMessage: 'Unable to load watches',
});

export const LOAD_ERROR_BODY = i18n.translate('xpack.inbox.watches.loadError.body', {
  defaultMessage: 'Something went wrong while fetching the watch catalog.',
});

export const RETRY = i18n.translate('xpack.inbox.watches.retry', {
  defaultMessage: 'Retry',
});

export const BACK_TO_WATCHES = i18n.translate('xpack.inbox.watches.detail.back', {
  defaultMessage: 'Back to watches',
});

export const SAVE = i18n.translate('xpack.inbox.watches.detail.save', {
  defaultMessage: 'Save',
});

export const DISCARD = i18n.translate('xpack.inbox.watches.detail.discard', {
  defaultMessage: 'Discard',
});

export const DELETE = i18n.translate('xpack.inbox.watches.detail.delete', {
  defaultMessage: 'Delete',
});

export const DELETE_CONFIRM_TITLE = i18n.translate(
  'xpack.inbox.watches.detail.deleteConfirm.title',
  {
    defaultMessage: 'Delete this watch?',
  }
);

export const deleteConfirmBody = (name: string) =>
  i18n.translate('xpack.inbox.watches.detail.deleteConfirm.body', {
    defaultMessage:
      'Permanently delete "{name}" and its workflow. Managed catalog watches cannot be deleted here.',
    values: { name },
  });

export const DELETE_CONFIRM_BUTTON = i18n.translate(
  'xpack.inbox.watches.detail.deleteConfirm.confirm',
  {
    defaultMessage: 'Delete watch',
  }
);

export const DELETE_CANCEL = i18n.translate('xpack.inbox.watches.detail.deleteConfirm.cancel', {
  defaultMessage: 'Cancel',
});

export const DELETE_SUCCESS = i18n.translate('xpack.inbox.watches.detail.deleteSuccess', {
  defaultMessage: 'Watch deleted',
});

export const DELETE_FAILED = i18n.translate('xpack.inbox.watches.detail.deleteFailed', {
  defaultMessage: 'Failed to delete watch',
});

export const IDENTITY_TITLE = i18n.translate('xpack.inbox.watches.detail.identity.title', {
  defaultMessage: 'Identity',
});

export const IDENTITY_SUBTITLE = i18n.translate('xpack.inbox.watches.detail.identity.subtitle', {
  defaultMessage: 'how this watch appears on cards, briefs & records',
});

export const DESCRIPTION_LABEL = i18n.translate('xpack.inbox.watches.detail.description', {
  defaultMessage: 'Description',
});

export const AUTONOMY_TITLE = i18n.translate('xpack.inbox.watches.detail.autonomy.title', {
  defaultMessage: 'Autonomy',
});

export const AUTONOMY_SUBTITLE = i18n.translate('xpack.inbox.watches.detail.autonomy.subtitle', {
  defaultMessage: 'applies to this watch only',
});

export const AUTONOMY_LEVEL = i18n.translate('xpack.inbox.watches.detail.autonomy.level', {
  defaultMessage: 'Level',
});

export const AUTONOMY_GUARDRAILS_NOTE = i18n.translate(
  'xpack.inbox.watches.detail.autonomy.guardrailsNote',
  {
    defaultMessage:
      'Org guardrails still apply — actions outside the allow-list stay gated at any level.',
  }
);

export const SCHEDULE_TITLE = i18n.translate('xpack.inbox.watches.detail.schedule.title', {
  defaultMessage: 'Schedule',
});

export const SCHEDULE_SUBTITLE = i18n.translate('xpack.inbox.watches.detail.schedule.subtitle', {
  defaultMessage: "when it's on duty, how it sweeps, where work goes after",
});

export const WORKFLOW_TRIGGERS_LABEL = i18n.translate(
  'xpack.inbox.watches.detail.schedule.triggersLabel',
  {
    defaultMessage: 'Workflow triggers',
  }
);

export const SCHEDULE_PROJECTION_NOTE = i18n.translate(
  'xpack.inbox.watches.detail.schedule.projectionNote',
  {
    defaultMessage:
      'Projected from the backing workflow. Edits below are local stubs until YAML write-back lands.',
  }
);

export const CADENCE_LABEL = i18n.translate('xpack.inbox.watches.detail.schedule.cadence', {
  defaultMessage: 'Cadence',
});

export const HANDOFF_LABEL = i18n.translate('xpack.inbox.watches.detail.schedule.handoff', {
  defaultMessage: 'Hand-off',
});

export const AGENT_CAPABILITIES_TITLE = i18n.translate(
  'xpack.inbox.watches.detail.capabilities.heading',
  {
    defaultMessage: 'Agent capabilities',
  }
);

export const agentCapabilitiesSubtitle = (on: number, total: number) =>
  i18n.translate('xpack.inbox.watches.detail.capabilities.subtitle', {
    defaultMessage: '{on} of {total} on — skills and workflows this watch’s agent may call',
    values: { on, total },
  });

export const ADD_CAPABILITY = i18n.translate('xpack.inbox.watches.detail.capabilities.add', {
  defaultMessage: 'Add',
});

export const DATA_BOUNDARIES_TITLE = i18n.translate(
  'xpack.inbox.watches.detail.dataBoundaries.title',
  {
    defaultMessage: 'Data boundaries',
  }
);

export const RECENT_RUNS_TITLE = i18n.translate('xpack.inbox.watches.detail.recentRuns.title', {
  defaultMessage: 'Recent runs',
});

export const VIEW_ALL_RUNS = i18n.translate('xpack.inbox.watches.detail.recentRuns.viewAll', {
  defaultMessage: 'View all runs',
});

export const NO_RUNS_YET = i18n.translate('xpack.inbox.watches.detail.recentRuns.empty', {
  defaultMessage: "No runs yet — this watch hasn't been activated.",
});

export const COL_TIME = i18n.translate('xpack.inbox.watches.detail.recentRuns.col.time', {
  defaultMessage: 'Time',
});

export const COL_STATUS = i18n.translate('xpack.inbox.watches.detail.recentRuns.col.status', {
  defaultMessage: 'Status',
});

export const COL_SUMMARY = i18n.translate('xpack.inbox.watches.detail.recentRuns.col.summary', {
  defaultMessage: 'Steps',
});

export const COL_TRIGGER = i18n.translate('xpack.inbox.watches.detail.recentRuns.col.trigger', {
  defaultMessage: 'Trigger',
});

export const NAV_INBOX = i18n.translate('xpack.inbox.watches.nav.inbox', {
  defaultMessage: 'Inbox',
});

export const NAV_WATCHES = i18n.translate('xpack.inbox.watches.nav.watches', {
  defaultMessage: 'Watches',
});

export const WATCH_NOT_FOUND_TITLE = i18n.translate('xpack.inbox.watches.notFound.title', {
  defaultMessage: 'Watch not found',
});

export const WATCH_NOT_FOUND_BODY = i18n.translate('xpack.inbox.watches.notFound.body', {
  defaultMessage: 'This watch may have been removed or the id is invalid.',
});

export const POC_STUB_TOAST = i18n.translate('xpack.inbox.watches.pocStub', {
  defaultMessage: 'POC stub — changes are not persisted yet.',
});

export const CADENCE_STREAM = i18n.translate('xpack.inbox.watches.cadence.stream', {
  defaultMessage: 'Streaming',
});

export const CADENCE_SWEEP = i18n.translate('xpack.inbox.watches.cadence.sweep', {
  defaultMessage: 'Interval sweeps',
});

export const CADENCE_MANUAL = i18n.translate('xpack.inbox.watches.cadence.manual', {
  defaultMessage: 'Manual sessions',
});

export const HANDOFF_OFFICER = i18n.translate('xpack.inbox.watches.handoff.officer', {
  defaultMessage: 'Escalates to Watch Officer',
});

export const HANDOFF_ONCALL = i18n.translate('xpack.inbox.watches.handoff.oncall', {
  defaultMessage: 'Pages on-call for criticals',
});

export const HANDOFF_BRIEF = i18n.translate('xpack.inbox.watches.handoff.brief', {
  defaultMessage: 'Receipts to the morning brief',
});

export const HANDOFF_RECORDS = i18n.translate('xpack.inbox.watches.handoff.records', {
  defaultMessage: 'Findings to Records',
});

export const HANDOFF_NONE = i18n.translate('xpack.inbox.watches.handoff.none', {
  defaultMessage: 'No hand-off',
});

export const LAST_RUN_PREFIX = i18n.translate('xpack.inbox.watches.capability.lastRunPrefix', {
  defaultMessage: 'last run',
});

export const NEVER_RUN_CAPABILITY = i18n.translate('xpack.inbox.watches.capability.neverRun', {
  defaultMessage: 'never run',
});

export const GATED_BADGE = i18n.translate('xpack.inbox.watches.capability.gated', {
  defaultMessage: 'gated',
});

export const KIND_SKILL = i18n.translate('xpack.inbox.watches.capability.kind.skill', {
  defaultMessage: 'Skill',
});

export const KIND_WORKFLOW = i18n.translate('xpack.inbox.watches.capability.kind.workflow', {
  defaultMessage: 'Workflow',
});
