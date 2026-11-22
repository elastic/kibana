/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const PAGE_TITLE = i18n.translate('xpack.cases.investigations.queue.pageTitle', {
  defaultMessage: 'Investigations',
});
export const PAGE_DESCRIPTION = i18n.translate('xpack.cases.investigations.queue.pageDescription', {
  defaultMessage: 'Work the queue: see what needs an owner, what is running and what is closed.',
});
export const NEW_INVESTIGATION = i18n.translate(
  'xpack.cases.investigations.queue.newInvestigation',
  {
    defaultMessage: 'New investigation',
  }
);

export const SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.cases.investigations.queue.searchPlaceholder',
  {
    defaultMessage: 'Search by title, description or ID',
  }
);
export const SEARCH_ARIA_LABEL = i18n.translate(
  'xpack.cases.investigations.queue.searchAriaLabel',
  {
    defaultMessage: 'Search investigations',
  }
);
export const FILTERS_LABEL = i18n.translate('xpack.cases.investigations.queue.filtersLabel', {
  defaultMessage: 'Filter investigations',
});
export const CLEAR_FILTERS = i18n.translate('xpack.cases.investigations.queue.clearFilters', {
  defaultMessage: 'Clear filters',
});

export const FILTER_STATUS = i18n.translate('xpack.cases.investigations.queue.filterStatus', {
  defaultMessage: 'Status',
});
export const FILTER_PRIORITY = i18n.translate('xpack.cases.investigations.queue.filterPriority', {
  defaultMessage: 'Priority',
});
export const FILTER_TYPE = i18n.translate('xpack.cases.investigations.queue.filterType', {
  defaultMessage: 'Template',
});
export const FILTER_VERDICT = i18n.translate('xpack.cases.investigations.queue.filterVerdict', {
  defaultMessage: 'Verdict',
});
export const FILTER_OWNER = i18n.translate('xpack.cases.investigations.queue.filterOwner', {
  defaultMessage: 'Owner',
});
export const FILTER_SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.cases.investigations.queue.filterSearchPlaceholder',
  { defaultMessage: 'Filter options' }
);
export const FILTER_NO_OPTIONS = i18n.translate(
  'xpack.cases.investigations.queue.filterNoOptions',
  {
    defaultMessage: 'No options',
  }
);
export const FILTER_NO_MATCH = i18n.translate('xpack.cases.investigations.queue.filterNoMatch', {
  defaultMessage: 'No options match your search',
});
export const FILTER_APPLY = i18n.translate('xpack.cases.investigations.queue.filterApply', {
  defaultMessage: 'Apply',
});
export const FILTER_ACTIVE_COUNT = (label: string, count: number) =>
  i18n.translate('xpack.cases.investigations.queue.filterActiveCount', {
    defaultMessage: '{label}, {count} selected',
    values: { label, count },
  });

export const OWNER_UNASSIGNED = i18n.translate('xpack.cases.investigations.queue.ownerUnassigned', {
  defaultMessage: 'No owner',
});
export const OWNER_ME = i18n.translate('xpack.cases.investigations.queue.ownerMe', {
  defaultMessage: 'Me',
});

export const COLUMN_ID = i18n.translate('xpack.cases.investigations.queue.columnId', {
  defaultMessage: 'ID',
});
export const COLUMN_TITLE = i18n.translate('xpack.cases.investigations.queue.columnTitle', {
  defaultMessage: 'Title',
});
export const COLUMN_STATUS = i18n.translate('xpack.cases.investigations.queue.columnStatus', {
  defaultMessage: 'Status',
});
export const COLUMN_PRIORITY = i18n.translate('xpack.cases.investigations.queue.columnPriority', {
  defaultMessage: 'Priority',
});
export const COLUMN_TYPE = i18n.translate('xpack.cases.investigations.queue.columnType', {
  defaultMessage: 'Template',
});
export const COLUMN_OWNER = i18n.translate('xpack.cases.investigations.queue.columnOwner', {
  defaultMessage: 'Owner',
});
export const COLUMN_VERDICT = i18n.translate('xpack.cases.investigations.queue.columnVerdict', {
  defaultMessage: 'Verdict',
});
export const COLUMN_ALERTS = i18n.translate('xpack.cases.investigations.queue.columnAlerts', {
  defaultMessage: 'Alerts',
});
export const COLUMN_EVIDENCE = i18n.translate('xpack.cases.investigations.queue.columnEvidence', {
  defaultMessage: 'Evidence',
});
export const COLUMN_OPEN_CLAIMS = i18n.translate(
  'xpack.cases.investigations.queue.columnOpenClaims',
  { defaultMessage: 'Open claims' }
);
export const COLUMN_EVIDENCE_CLAIMS = i18n.translate(
  'xpack.cases.investigations.queue.columnEvidenceClaims',
  { defaultMessage: 'Evidence / claims' }
);
export const EVIDENCE_CLAIMS = (evidence: number, openClaims: number) =>
  i18n.translate('xpack.cases.investigations.queue.evidenceClaims', {
    defaultMessage: '{evidence} / {openClaims} open',
    values: { evidence, openClaims },
  });
export const COLUMN_UPDATED = i18n.translate('xpack.cases.investigations.queue.columnUpdated', {
  defaultMessage: 'Updated',
});
export const COLUMN_CREATED = i18n.translate('xpack.cases.investigations.queue.columnCreated', {
  defaultMessage: 'Created',
});
export const UNASSIGNED = i18n.translate('xpack.cases.investigations.queue.unassigned', {
  defaultMessage: 'No owner',
});
export const VERDICT_AGENT_SUFFIX = i18n.translate(
  'xpack.cases.investigations.queue.verdictAgentSuffix',
  { defaultMessage: 'agent' }
);
export const NO_VALUE = i18n.translate('xpack.cases.investigations.queue.noValue', {
  defaultMessage: 'None',
});

export const TABLE_CAPTION = i18n.translate('xpack.cases.investigations.queue.tableCaption', {
  defaultMessage: 'Investigations queue. Column headers with buttons sort the list.',
});
export const SHOWING = (from: number, to: number, total: number) =>
  i18n.translate('xpack.cases.investigations.queue.showing', {
    defaultMessage:
      'Showing {from}-{to} of {total, plural, one {# investigation} other {# investigations}}',
    values: { from, to, total },
  });
export const RESULT_CAP = (cap: number) =>
  i18n.translate('xpack.cases.investigations.queue.resultCap', {
    defaultMessage: 'Only the first {cap} matches can be paged. Narrow the list with filters.',
    values: { cap },
  });

export const EMPTY_TITLE = i18n.translate('xpack.cases.investigations.queue.emptyTitle', {
  defaultMessage: 'No investigations yet',
});
export const EMPTY_BODY = i18n.translate('xpack.cases.investigations.queue.emptyBody', {
  defaultMessage:
    'An investigation gathers the alerts, evidence, claims and actions for one incident, so people and agents work from the same record. Start one to see it here.',
});
export const NO_RESULTS_TITLE = i18n.translate('xpack.cases.investigations.queue.noResultsTitle', {
  defaultMessage: 'No investigations match',
});
export const NO_RESULTS_BODY = i18n.translate('xpack.cases.investigations.queue.noResultsBody', {
  defaultMessage: 'Try a different search or remove some filters.',
});
export const ERROR_TITLE = i18n.translate('xpack.cases.investigations.queue.errorTitle', {
  defaultMessage: 'Could not load investigations',
});
export const LOADING = i18n.translate('xpack.cases.investigations.queue.loading', {
  defaultMessage: 'Loading investigations',
});

export const FILTER_FIELDS = i18n.translate('xpack.cases.investigations.queue.filterFields', {
  defaultMessage: 'Fields',
});
export const FILTER_FIELDS_TITLE = i18n.translate(
  'xpack.cases.investigations.queue.filterFieldsTitle',
  { defaultMessage: 'Filter by field' }
);
export const FILTER_FIELDS_TEXT_PLACEHOLDER = i18n.translate(
  'xpack.cases.investigations.queue.filterFieldsTextPlaceholder',
  { defaultMessage: 'Exact value' }
);
export const FILTER_FIELDS_ANY = i18n.translate(
  'xpack.cases.investigations.queue.filterFieldsAny',
  {
    defaultMessage: 'Any',
  }
);
export const FILTER_FIELDS_YES = i18n.translate(
  'xpack.cases.investigations.queue.filterFieldsYes',
  {
    defaultMessage: 'Yes',
  }
);
export const FILTER_FIELDS_NO = i18n.translate('xpack.cases.investigations.queue.filterFieldsNo', {
  defaultMessage: 'No',
});
export const FILTER_FIELDS_NONE = i18n.translate(
  'xpack.cases.investigations.queue.filterFieldsNone',
  { defaultMessage: 'The investigation templates have no fields to filter by.' }
);
export const FILTER_FIELDS_HELP = i18n.translate(
  'xpack.cases.investigations.queue.filterFieldsHelp',
  {
    defaultMessage:
      'Fields come from the investigation templates. Text fields match the exact value.',
  }
);
export const COLUMNS_BUTTON = i18n.translate('xpack.cases.investigations.queue.columnsButton', {
  defaultMessage: 'Columns',
});
export const COLUMNS_TITLE = i18n.translate('xpack.cases.investigations.queue.columnsTitle', {
  defaultMessage: 'Show field columns',
});
export const COLUMNS_SEARCH = i18n.translate('xpack.cases.investigations.queue.columnsSearch', {
  defaultMessage: 'Find a field',
});
export const COLUMNS_ACTIVE_COUNT = (count: number) =>
  i18n.translate('xpack.cases.investigations.queue.columnsActiveCount', {
    defaultMessage: 'Columns, {count} shown',
    values: { count },
  });

export const STATUS_ALL_IN_CATEGORY = (category: string) =>
  i18n.translate('xpack.cases.investigations.queue.statusAllInCategory', {
    defaultMessage: 'All {category}',
    values: { category },
  });
export const STATUS_DISABLED_LABEL = (label: string) =>
  i18n.translate('xpack.cases.investigations.queue.statusDisabledLabel', {
    defaultMessage: '{label} (disabled)',
    values: { label },
  });
export const FILTER_ASSIGNEES = i18n.translate('xpack.cases.investigations.queue.filterAssignees', {
  defaultMessage: 'Assignees',
});
export const ASSIGNEES_ME = i18n.translate('xpack.cases.investigations.queue.assigneesMe', {
  defaultMessage: 'Assigned to me',
});
export const ASSIGNEES_NONE = i18n.translate('xpack.cases.investigations.queue.assigneesNone', {
  defaultMessage: 'Unassigned',
});
export const ASSIGNEES_SEARCH = i18n.translate('xpack.cases.investigations.queue.assigneesSearch', {
  defaultMessage: 'Search users',
});
export const FILTER_TAGS = i18n.translate('xpack.cases.investigations.queue.filterTags', {
  defaultMessage: 'Tags',
});
export const COLUMN_ASSIGNEES = i18n.translate('xpack.cases.investigations.queue.columnAssignees', {
  defaultMessage: 'Assignees',
});
export const PAUSED = i18n.translate('xpack.cases.investigations.queue.paused', {
  defaultMessage: 'Paused',
});
export const PAUSED_TOOLTIP = (reason: string) =>
  i18n.translate('xpack.cases.investigations.queue.pausedTooltip', {
    defaultMessage: 'Paused: {reason}. The time paused is left out of the age.',
    values: { reason },
  });
export const PAUSED_TOOLTIP_NO_REASON = i18n.translate(
  'xpack.cases.investigations.queue.pausedTooltipNoReason',
  { defaultMessage: 'Paused. The time paused is left out of the age.' }
);
export const COLUMN_AGE = i18n.translate('xpack.cases.investigations.queue.columnAge', {
  defaultMessage: 'Age',
});
export const AGE_TOOLTIP = i18n.translate('xpack.cases.investigations.queue.ageTooltip', {
  defaultMessage: 'Time since the investigation was created, without the time it was paused.',
});
export const INVESTIGATION_SETTINGS = i18n.translate(
  'xpack.cases.investigations.queue.investigationSettings',
  { defaultMessage: 'Investigation settings' }
);
export const USER_UNKNOWN = i18n.translate('xpack.cases.investigations.queue.userUnknown', {
  defaultMessage: 'Unknown user',
});
