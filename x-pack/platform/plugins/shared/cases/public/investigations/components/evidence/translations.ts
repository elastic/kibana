/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ADD = i18n.translate('xpack.cases.investigations.evidence.add', {
  defaultMessage: 'Add',
});

export const BACK = i18n.translate('xpack.cases.investigations.evidence.back', {
  defaultMessage: 'Back',
});

export const CANCEL = i18n.translate('xpack.cases.investigations.evidence.cancel', {
  defaultMessage: 'Cancel',
});

export const CLOSE = i18n.translate('xpack.cases.investigations.evidence.close', {
  defaultMessage: 'Close',
});

export const DONE = i18n.translate('xpack.cases.investigations.evidence.done', {
  defaultMessage: 'Done',
});

export const SAVE = i18n.translate('xpack.cases.investigations.evidence.save', {
  defaultMessage: 'Save',
});

export const RETRY = i18n.translate('xpack.cases.investigations.evidence.retry', {
  defaultMessage: 'Retry',
});

export const DELETE = i18n.translate('xpack.cases.investigations.evidence.delete', {
  defaultMessage: 'Delete',
});

export const OPTIONAL = i18n.translate('xpack.cases.investigations.evidence.optional', {
  defaultMessage: 'Optional',
});

export const NO_VALUE = i18n.translate('xpack.cases.investigations.evidence.noValue', {
  defaultMessage: '-',
});

export const LOADING = i18n.translate('xpack.cases.investigations.evidence.loading', {
  defaultMessage: 'Loading evidence',
});

export const LOAD_ERROR = i18n.translate('xpack.cases.investigations.evidence.loadError', {
  defaultMessage: 'Could not load the evidence',
});

export const LOADING_ITEM = i18n.translate('xpack.cases.investigations.evidence.loadingItem', {
  defaultMessage: 'Loading evidence item',
});

export const ITEM_NOT_FOUND = i18n.translate('xpack.cases.investigations.evidence.itemNotFound', {
  defaultMessage: 'This evidence item no longer exists',
});

export const EMPTY_TITLE = i18n.translate('xpack.cases.investigations.evidence.emptyTitle', {
  defaultMessage: 'No evidence yet',
});

export const EMPTY_BODY = i18n.translate('xpack.cases.investigations.evidence.emptyBody', {
  defaultMessage:
    'Evidence is what the findings rest on: alerts, entities, indicators, queries, files and notes. Add the first item, or import indicators from a CSV file.',
});

export const NO_RESULTS = i18n.translate('xpack.cases.investigations.evidence.noResults', {
  defaultMessage: 'No evidence matches these filters.',
});

export const TOTAL_SUMMARY = (total: number, all: number) =>
  i18n.translate('xpack.cases.investigations.evidence.totalSummary', {
    defaultMessage:
      '{total, number} of {all, number} items. The grid pages on the server, so search, filters and bulk actions stay quick at thousands of items. Evidence keeps a preserved copy after source data ages out.',
    values: { total, all },
  });

export const TOOLBAR_LABEL = i18n.translate('xpack.cases.investigations.evidence.toolbarLabel', {
  defaultMessage: 'Evidence search and filters',
});

export const SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.cases.investigations.evidence.searchPlaceholder',
  {
    defaultMessage: 'Search evidence',
  }
);

export const SEARCH_ARIA_LABEL = i18n.translate(
  'xpack.cases.investigations.evidence.searchAriaLabel',
  {
    defaultMessage: 'Search evidence',
  }
);

export const FILTER_TYPE = i18n.translate('xpack.cases.investigations.evidence.filterType', {
  defaultMessage: 'Type',
});

export const FILTER_INDICATOR_TYPE = i18n.translate(
  'xpack.cases.investigations.evidence.filterIndicatorType',
  {
    defaultMessage: 'Indicator type',
  }
);

export const FILTER_ADDED_BY = i18n.translate('xpack.cases.investigations.evidence.filterAddedBy', {
  defaultMessage: 'Added by',
});

export const FILTER_NEW_SINCE_HANDOFF = i18n.translate(
  'xpack.cases.investigations.evidence.filterNewSinceHandoff',
  {
    defaultMessage: 'New since last handoff',
  }
);

export const CLEAR_FILTERS = i18n.translate('xpack.cases.investigations.evidence.clearFilters', {
  defaultMessage: 'Clear filters',
});

export const IMPORT_CSV = i18n.translate('xpack.cases.investigations.evidence.importCsv', {
  defaultMessage: 'Import CSV',
});

export const EXPORT = i18n.translate('xpack.cases.investigations.evidence.export', {
  defaultMessage: 'Export',
});

export const ADD_EVIDENCE = i18n.translate('xpack.cases.investigations.evidence.addEvidence', {
  defaultMessage: 'Add evidence',
});

export const FACET_SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.cases.investigations.evidence.facetSearchPlaceholder',
  {
    defaultMessage: 'Search',
  }
);

export const FACET_NO_OPTIONS = i18n.translate(
  'xpack.cases.investigations.evidence.facetNoOptions',
  {
    defaultMessage: 'No options',
  }
);

export const FACET_NO_MATCH = i18n.translate('xpack.cases.investigations.evidence.facetNoMatch', {
  defaultMessage: 'Nothing matches the search',
});

export const FACET_ACTIVE_COUNT = (label: string, count: number) =>
  i18n.translate('xpack.cases.investigations.evidence.facetActiveCount', {
    defaultMessage: '{label}, {count, plural, one {# selected} other {# selected}}',
    values: { label, count },
  });

export const TABLE_CAPTION = i18n.translate('xpack.cases.investigations.evidence.tableCaption', {
  defaultMessage: 'Evidence',
});

export const COLUMN_ID = i18n.translate('xpack.cases.investigations.evidence.columnId', {
  defaultMessage: 'ID',
});

export const COLUMN_TYPE = i18n.translate('xpack.cases.investigations.evidence.columnType', {
  defaultMessage: 'Type',
});

export const COLUMN_EVIDENCE = i18n.translate(
  'xpack.cases.investigations.evidence.columnEvidence',
  {
    defaultMessage: 'Evidence',
  }
);

export const COLUMN_SOURCE = i18n.translate('xpack.cases.investigations.evidence.columnSource', {
  defaultMessage: 'Source',
});

export const COLUMN_ADDED_BY = i18n.translate('xpack.cases.investigations.evidence.columnAddedBy', {
  defaultMessage: 'Added by',
});

export const COLUMN_ADDED = i18n.translate('xpack.cases.investigations.evidence.columnAdded', {
  defaultMessage: 'Added',
});

export const COLUMN_COMMENTS = i18n.translate(
  'xpack.cases.investigations.evidence.columnComments',
  {
    defaultMessage: 'Comments',
  }
);

export const COLUMN_SEEN_ELSEWHERE = i18n.translate(
  'xpack.cases.investigations.evidence.columnSeenElsewhere',
  {
    defaultMessage: 'Seen elsewhere',
  }
);

export const COLUMN_SEEN_IN = i18n.translate('xpack.cases.investigations.evidence.columnSeenIn', {
  defaultMessage: 'Seen in',
});

export const COLUMN_USED_IN = i18n.translate('xpack.cases.investigations.evidence.columnUsedIn', {
  defaultMessage: 'Used in',
});

export const SOURCE_EXPIRED = i18n.translate('xpack.cases.investigations.evidence.sourceExpired', {
  defaultMessage: 'Source expired',
});

export const PRESERVED_TOOLTIP = (hash: string) =>
  i18n.translate('xpack.cases.investigations.evidence.preservedTooltip', {
    defaultMessage: 'Preserved copy, SHA-256 {hash}',
    values: { hash },
  });

export const PRESERVED_ARIA = (ref: string) =>
  i18n.translate('xpack.cases.investigations.evidence.preservedAria', {
    defaultMessage: 'Preserved copy of {ref}',
    values: { ref },
  });

export const COMMENTS_ON = (count: number, ref: string) =>
  i18n.translate('xpack.cases.investigations.evidence.commentsOn', {
    defaultMessage: '{count, plural, one {# comment} other {# comments}} on {ref}',
    values: { count, ref },
  });

export const NOT_LINKED = i18n.translate('xpack.cases.investigations.evidence.notLinked', {
  defaultMessage: 'Not linked',
});

export const OPEN_CLAIM = (ref: string) =>
  i18n.translate('xpack.cases.investigations.evidence.openClaim', {
    defaultMessage: 'Open claim {ref}',
    values: { ref },
  });

export const SEEN_IN_OTHER = (count: number) =>
  i18n.translate('xpack.cases.investigations.evidence.seenInOther', {
    defaultMessage:
      'Seen in {count, plural, one {# other investigation} other {# other investigations}}',
    values: { count },
  });

export const USED_IN_MORE = (count: number) =>
  i18n.translate('xpack.cases.investigations.evidence.usedInMore', {
    defaultMessage: '+{count}',
    values: { count },
  });

export const SEEN_IN_OTHER_TITLE = i18n.translate(
  'xpack.cases.investigations.evidence.seenInOtherTitle',
  {
    defaultMessage: 'Other investigations with this indicator',
  }
);

export const SEEN_MORE = (count: number) =>
  i18n.translate('xpack.cases.investigations.evidence.seenMore', {
    defaultMessage: 'and {count, number} more',
    values: { count },
  });

export const SEEN_NOWHERE = i18n.translate('xpack.cases.investigations.evidence.seenNowhere', {
  defaultMessage: 'This indicator is not in any other investigation.',
});

export const BULK_LABEL = i18n.translate('xpack.cases.investigations.evidence.bulkLabel', {
  defaultMessage: 'Actions for the selected evidence',
});

export const SELECTED = (count: number) =>
  i18n.translate('xpack.cases.investigations.evidence.selected', {
    defaultMessage: '{count, number} selected',
    values: { count },
  });

export const LINK_TO_CLAIM = i18n.translate('xpack.cases.investigations.evidence.linkToClaim', {
  defaultMessage: 'Link to claim',
});

export const NO_CLAIMS = i18n.translate('xpack.cases.investigations.evidence.noClaims', {
  defaultMessage: 'This investigation has no claims yet.',
});

export const EXPORT_SELECTED = i18n.translate(
  'xpack.cases.investigations.evidence.exportSelected',
  {
    defaultMessage: 'Export selected',
  }
);

export const HIDE_FROM_AGENTS = i18n.translate(
  'xpack.cases.investigations.evidence.hideFromAgents',
  {
    defaultMessage: 'Hide from agents',
  }
);

export const ALLOW_AGENTS = i18n.translate('xpack.cases.investigations.evidence.allowAgents', {
  defaultMessage: 'Allow agents',
});

export const PRESERVE_COPIES = i18n.translate(
  'xpack.cases.investigations.evidence.preserveCopies',
  {
    defaultMessage: 'Preserve copies',
  }
);

export const CLEAR_SELECTION = i18n.translate(
  'xpack.cases.investigations.evidence.clearSelection',
  {
    defaultMessage: 'Clear',
  }
);

export const DELETE_TITLE = (count: number) =>
  i18n.translate('xpack.cases.investigations.evidence.deleteTitle', {
    defaultMessage: 'Delete {count, plural, one {# evidence item} other {# evidence items}}?',
    values: { count },
  });

export const DELETE_BODY = i18n.translate('xpack.cases.investigations.evidence.deleteBody', {
  defaultMessage:
    'The items are removed from this investigation. Claims that cite them lose the citation. This cannot be undone.',
});

export const DELETED = (count: number) =>
  i18n.translate('xpack.cases.investigations.evidence.deleted', {
    defaultMessage: 'Deleted {count, plural, one {# evidence item} other {# evidence items}}.',
    values: { count },
  });

export const HIDDEN_FROM_AGENTS = (count: number) =>
  i18n.translate('xpack.cases.investigations.evidence.hiddenFromAgents', {
    defaultMessage: 'Hid {count, plural, one {# item} other {# items}} from agents.',
    values: { count },
  });

export const SHOWN_TO_AGENTS = (count: number) =>
  i18n.translate('xpack.cases.investigations.evidence.shownToAgents', {
    defaultMessage: 'Agents can use {count, plural, one {# item} other {# items}} again.',
    values: { count },
  });

export const PRESERVED = (count: number) =>
  i18n.translate('xpack.cases.investigations.evidence.preserved', {
    defaultMessage: 'Preserved {count, plural, one {# copy} other {# copies}}.',
    values: { count },
  });

export const PRESERVE_NOTHING = i18n.translate(
  'xpack.cases.investigations.evidence.preserveNothing',
  {
    defaultMessage: 'Nothing to preserve. These items have no source data to copy.',
  }
);

export const BULK_PARTIAL = (count: number) =>
  i18n.translate('xpack.cases.investigations.evidence.bulkPartial', {
    defaultMessage: '{count, plural, one {# item} other {# items}} could not be changed.',
    values: { count },
  });

export const LINKED = (count: number, ref: string) =>
  i18n.translate('xpack.cases.investigations.evidence.linked', {
    defaultMessage: 'Linked {count, plural, one {# item} other {# items}} to {ref}.',
    values: { count, ref },
  });

export const LINK_CONFLICT = (ref: string) =>
  i18n.translate('xpack.cases.investigations.evidence.linkConflict', {
    defaultMessage: 'Claim {ref} changed while you worked. Reload and try again.',
    values: { ref },
  });

export const EXPORT_TITLE = i18n.translate('xpack.cases.investigations.evidence.exportTitle', {
  defaultMessage: 'Export evidence',
});

export const EXPORT_INTRO = (count: number) =>
  i18n.translate('xpack.cases.investigations.evidence.exportIntro', {
    defaultMessage:
      'Exports what the grid shows now: {count, plural, one {# item matches} other {# items match}} the current search and filters.',
    values: { count },
  });

export const EXPORT_SELECTED_INTRO = (count: number) =>
  i18n.translate('xpack.cases.investigations.evidence.exportSelectedIntro', {
    defaultMessage: 'Exports the {count, plural, one {# selected item} other {# selected items}}.',
    values: { count },
  });

export const INDICATORS_ONLY = i18n.translate(
  'xpack.cases.investigations.evidence.indicatorsOnly',
  {
    defaultMessage: 'Indicators only',
  }
);

export const FORMAT = i18n.translate('xpack.cases.investigations.evidence.format', {
  defaultMessage: 'Format',
});

export const FORMAT_CSV = i18n.translate('xpack.cases.investigations.evidence.formatCsv', {
  defaultMessage: 'CSV',
});

export const FORMAT_JSON = i18n.translate('xpack.cases.investigations.evidence.formatJson', {
  defaultMessage: 'JSON',
});

export const FORMAT_STIX = i18n.translate('xpack.cases.investigations.evidence.formatStix', {
  defaultMessage: 'STIX',
});

export const FORMAT_LIST = i18n.translate('xpack.cases.investigations.evidence.formatList', {
  defaultMessage: 'Plain list',
});

export const EXPORT_PREVIEW = (count: number) =>
  i18n.translate('xpack.cases.investigations.evidence.exportPreview', {
    defaultMessage: 'Preview, first lines of {count, number} rows',
    values: { count },
  });

export const EXPORT_MORE_LINES = (count: number) =>
  i18n.translate('xpack.cases.investigations.evidence.exportMoreLines', {
    defaultMessage: '... {count, number} more lines',
    values: { count },
  });

export const EXPORT_EMPTY = i18n.translate('xpack.cases.investigations.evidence.exportEmpty', {
  defaultMessage: 'Nothing to export with these filters.',
});

export const EXPORT_ERROR = i18n.translate('xpack.cases.investigations.evidence.exportError', {
  defaultMessage: 'Could not build the export',
});

export const DOWNLOAD = i18n.translate('xpack.cases.investigations.evidence.download', {
  defaultMessage: 'Download',
});

export const COPY_ROWS = (count: number) =>
  i18n.translate('xpack.cases.investigations.evidence.copyRows', {
    defaultMessage: 'Copy {count, plural, one {# row} other {# rows}}',
    values: { count },
  });

export const COPIED = (count: number) =>
  i18n.translate('xpack.cases.investigations.evidence.copied', {
    defaultMessage: 'Copied {count, plural, one {# row} other {# rows}}.',
    values: { count },
  });

export const ADD_INTRO = i18n.translate('xpack.cases.investigations.evidence.addIntro', {
  defaultMessage:
    'Choose what to add. Everything you add is attributed to you and kept with a preserved copy.',
});

export const ADD_KIND_TITLE = (kind: string) =>
  i18n.translate('xpack.cases.investigations.evidence.addKindTitle', {
    defaultMessage: 'Add {kind}',
    values: { kind },
  });

export const KIND_SAVED_SEARCH_DESCRIPTION = i18n.translate(
  'xpack.cases.investigations.evidence.kindSavedSearchDescription',
  {
    defaultMessage: 'A Discover or ES|QL saved search, with an optional preserved copy of results.',
  }
);

export const KIND_ENTITY_DESCRIPTION = i18n.translate(
  'xpack.cases.investigations.evidence.kindEntityDescription',
  {
    defaultMessage: 'A host, user or non-human identity from the entity store.',
  }
);

export const KIND_INDICATOR_DESCRIPTION = i18n.translate(
  'xpack.cases.investigations.evidence.kindIndicatorDescription',
  {
    defaultMessage:
      'An observable: an IP address, domain, URL, file hash, file path or a custom type.',
  }
);

export const KIND_ALERT_DESCRIPTION = i18n.translate(
  'xpack.cases.investigations.evidence.kindAlertDescription',
  {
    defaultMessage: 'An alert from the alerts index.',
  }
);

export const KIND_QUERY_DESCRIPTION = i18n.translate(
  'xpack.cases.investigations.evidence.kindQueryDescription',
  {
    defaultMessage: 'An ES|QL query that you ran or wrote.',
  }
);

export const KIND_VISUALIZATION_DESCRIPTION = i18n.translate(
  'xpack.cases.investigations.evidence.kindVisualizationDescription',
  {
    defaultMessage: 'A Lens visualization or dashboard.',
  }
);

export const KIND_FILE_DESCRIPTION = i18n.translate(
  'xpack.cases.investigations.evidence.kindFileDescription',
  {
    defaultMessage: 'A log, screenshot, report or other file.',
  }
);

export const KIND_NOTE_DESCRIPTION = i18n.translate(
  'xpack.cases.investigations.evidence.kindNoteDescription',
  {
    defaultMessage: 'An observation in your own words.',
  }
);

export const SOURCE_SAVED_SEARCH = i18n.translate(
  'xpack.cases.investigations.evidence.sourceSavedSearch',
  {
    defaultMessage: 'Discover saved search',
  }
);

export const SOURCE_ENTITY = i18n.translate('xpack.cases.investigations.evidence.sourceEntity', {
  defaultMessage: 'Entity store',
});

export const SOURCE_INDICATOR = i18n.translate(
  'xpack.cases.investigations.evidence.sourceIndicator',
  {
    defaultMessage: 'Analyst entry',
  }
);

export const SOURCE_ALERT = i18n.translate('xpack.cases.investigations.evidence.sourceAlert', {
  defaultMessage: 'Alerts index',
});

export const SOURCE_QUERY = i18n.translate('xpack.cases.investigations.evidence.sourceQuery', {
  defaultMessage: 'ES|QL query',
});

export const SOURCE_VISUALIZATION = i18n.translate(
  'xpack.cases.investigations.evidence.sourceVisualization',
  {
    defaultMessage: 'Lens',
  }
);

export const SOURCE_NOTE = i18n.translate('xpack.cases.investigations.evidence.sourceNote', {
  defaultMessage: 'Analyst note',
});

export const WHY_LABEL = i18n.translate('xpack.cases.investigations.evidence.whyLabel', {
  defaultMessage: 'Why it matters',
});

export const WHY_HELP = i18n.translate('xpack.cases.investigations.evidence.whyHelp', {
  defaultMessage: 'Explain how this supports or weakens a conclusion.',
});

export const TITLE_LABEL = i18n.translate('xpack.cases.investigations.evidence.titleLabel', {
  defaultMessage: 'Title',
});

export const TITLE_PLACEHOLDER = i18n.translate(
  'xpack.cases.investigations.evidence.titlePlaceholder',
  {
    defaultMessage: 'Short name for this evidence',
  }
);

export const TITLE_REQUIRED = i18n.translate('xpack.cases.investigations.evidence.titleRequired', {
  defaultMessage: 'Enter a title.',
});

export const DESCRIPTION_LABEL = i18n.translate(
  'xpack.cases.investigations.evidence.descriptionLabel',
  {
    defaultMessage: 'Description',
  }
);

export const DO_NOT_LINK = i18n.translate('xpack.cases.investigations.evidence.doNotLink', {
  defaultMessage: 'Do not link yet',
});

export const LINK_TO_CLAIM_LABEL = i18n.translate(
  'xpack.cases.investigations.evidence.linkToClaimLabel',
  {
    defaultMessage: 'Link to claim',
  }
);

export const ENTER_MANUALLY = i18n.translate('xpack.cases.investigations.evidence.enterManually', {
  defaultMessage: 'Enter details manually',
});

export const PICK_FROM_LIST = i18n.translate('xpack.cases.investigations.evidence.pickFromList', {
  defaultMessage: 'Choose from the list',
});

export const PICK_FROM_SCOPE = i18n.translate('xpack.cases.investigations.evidence.pickFromScope', {
  defaultMessage: 'Choose from this investigation',
});

export const PICKER_SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.cases.investigations.evidence.pickerSearchPlaceholder',
  {
    defaultMessage: 'Search',
  }
);

export const PICKER_LOAD_ERROR = i18n.translate(
  'xpack.cases.investigations.evidence.pickerLoadError',
  {
    defaultMessage: 'Could not load the list',
  }
);

export const ADDED_ONE = (ref: string) =>
  i18n.translate('xpack.cases.investigations.evidence.addedOne', {
    defaultMessage: 'Added {ref} to the evidence.',
    values: { ref },
  });

export const ADDED_MANY = (count: number) =>
  i18n.translate('xpack.cases.investigations.evidence.addedMany', {
    defaultMessage: 'Added {count, number} items to the evidence.',
    values: { count },
  });

export const ADD_ALERTS = (count: number) =>
  i18n.translate('xpack.cases.investigations.evidence.addAlerts', {
    defaultMessage: 'Add {count, number} alerts',
    values: { count },
  });

export const CREATE_PARTIAL = (count: number) =>
  i18n.translate('xpack.cases.investigations.evidence.createPartial', {
    defaultMessage: '{count, plural, one {# item} other {# items}} could not be added',
    values: { count },
  });

export const SAVED_SEARCH_LABEL = i18n.translate(
  'xpack.cases.investigations.evidence.savedSearchLabel',
  {
    defaultMessage: 'Saved search',
  }
);

export const SAVED_SEARCH_CHOOSE = i18n.translate(
  'xpack.cases.investigations.evidence.savedSearchChoose',
  {
    defaultMessage: 'Choose a saved search.',
  }
);

export const SAVED_SEARCH_NAME_REQUIRED = i18n.translate(
  'xpack.cases.investigations.evidence.savedSearchNameRequired',
  {
    defaultMessage: 'Enter a name for the saved search.',
  }
);

export const SAVED_SEARCH_NAME_PLACEHOLDER = i18n.translate(
  'xpack.cases.investigations.evidence.savedSearchNamePlaceholder',
  {
    defaultMessage: 'Example: Rundll32 child processes, 7d',
  }
);

export const SAVED_SEARCH_NONE = i18n.translate(
  'xpack.cases.investigations.evidence.savedSearchNone',
  {
    defaultMessage: 'No saved searches found',
  }
);

export const SAVED_SEARCH_NONE_BODY = i18n.translate(
  'xpack.cases.investigations.evidence.savedSearchNoneBody',
  {
    defaultMessage:
      'Save a search in Discover to pick it here, or enter its name and description by hand.',
  }
);

export const SAVED_SEARCH_SUMMARY = i18n.translate(
  'xpack.cases.investigations.evidence.savedSearchSummary',
  {
    defaultMessage: 'Saved search',
  }
);

export const PRESERVE_RESULTS = i18n.translate(
  'xpack.cases.investigations.evidence.preserveResults',
  {
    defaultMessage: 'Preserve a copy of the results',
  }
);

export const ENTITY_LABEL = i18n.translate('xpack.cases.investigations.evidence.entityLabel', {
  defaultMessage: 'Entity',
});

export const ENTITY_CHOOSE = i18n.translate('xpack.cases.investigations.evidence.entityChoose', {
  defaultMessage: 'Choose an entity.',
});

export const ENTITY_NAME_LABEL = i18n.translate(
  'xpack.cases.investigations.evidence.entityNameLabel',
  {
    defaultMessage: 'Name',
  }
);

export const ENTITY_NAME_REQUIRED = i18n.translate(
  'xpack.cases.investigations.evidence.entityNameRequired',
  {
    defaultMessage: 'Enter the entity name.',
  }
);

export const ENTITY_TYPE_LABEL = i18n.translate(
  'xpack.cases.investigations.evidence.entityTypeLabel',
  {
    defaultMessage: 'Entity type',
  }
);

export const ENTITY_ATTRIBUTE_TYPE = i18n.translate(
  'xpack.cases.investigations.evidence.entityAttributeType',
  {
    defaultMessage: 'Entity type',
  }
);

export const ENTITY_ATTRIBUTE_NAME = i18n.translate(
  'xpack.cases.investigations.evidence.entityAttributeName',
  {
    defaultMessage: 'Name',
  }
);

export const ENTITY_ATTRIBUTE_CRITICALITY = i18n.translate(
  'xpack.cases.investigations.evidence.entityAttributeCriticality',
  {
    defaultMessage: 'Asset criticality',
  }
);

export const ENTITY_ATTRIBUTE_RISK = i18n.translate(
  'xpack.cases.investigations.evidence.entityAttributeRisk',
  {
    defaultMessage: 'Risk score',
  }
);

export const INDICATOR_MODE_LEGEND = i18n.translate(
  'xpack.cases.investigations.evidence.indicatorModeLegend',
  {
    defaultMessage: 'How to add indicators',
  }
);

export const INDICATOR_MODE_SINGLE = i18n.translate(
  'xpack.cases.investigations.evidence.indicatorModeSingle',
  {
    defaultMessage: 'Single indicator',
  }
);

export const INDICATOR_MODE_IMPORT = i18n.translate(
  'xpack.cases.investigations.evidence.indicatorModeImport',
  {
    defaultMessage: 'Import CSV',
  }
);

export const INDICATOR_TYPE_LABEL = i18n.translate(
  'xpack.cases.investigations.evidence.indicatorTypeLabel',
  {
    defaultMessage: 'Indicator type',
  }
);

export const INDICATOR_VALUE_LABEL = i18n.translate(
  'xpack.cases.investigations.evidence.indicatorValueLabel',
  {
    defaultMessage: 'Value',
  }
);

export const INDICATOR_EXAMPLE = (example: string) =>
  i18n.translate('xpack.cases.investigations.evidence.indicatorExample', {
    defaultMessage: 'Example: {example}',
    values: { example },
  });

export const INDICATOR_FACT_TYPE = i18n.translate(
  'xpack.cases.investigations.evidence.indicatorFactType',
  {
    defaultMessage: 'Type',
  }
);

export const INDICATOR_FACT_VALUE = i18n.translate(
  'xpack.cases.investigations.evidence.indicatorFactValue',
  {
    defaultMessage: 'Value',
  }
);

export const INDICATOR_OTHER_EXAMPLE = i18n.translate(
  'xpack.cases.investigations.evidence.indicatorOtherExample',
  {
    defaultMessage: 'The value as it appears in your data',
  }
);

export const INDICATOR_VALUE_TOO_LONG = (max: number) =>
  i18n.translate('xpack.cases.investigations.evidence.indicatorValueTooLong', {
    defaultMessage: 'The value can be at most {max, number} characters.',
    values: { max },
  });

export const IMPORT_SUBMIT = i18n.translate('xpack.cases.investigations.evidence.importSubmit', {
  defaultMessage: 'Import',
});

export const IMPORT_INTRO = i18n.translate('xpack.cases.investigations.evidence.importIntro', {
  defaultMessage:
    'Upload or paste a CSV file with a header row. The value column is required. The type and why columns are optional; the type is detected from the value when it is missing. Duplicates already in this investigation are skipped.',
});

export const IMPORT_FILE_LABEL = i18n.translate(
  'xpack.cases.investigations.evidence.importFileLabel',
  {
    defaultMessage: 'CSV file',
  }
);

export const IMPORT_FILE_HELP = i18n.translate(
  'xpack.cases.investigations.evidence.importFileHelp',
  {
    defaultMessage: 'Up to 10 MiB. Thousands of rows import in one step.',
  }
);

export const IMPORT_FILE_PROMPT = i18n.translate(
  'xpack.cases.investigations.evidence.importFilePrompt',
  {
    defaultMessage: 'Select or drag a CSV file',
  }
);

export const IMPORT_FILE_SUMMARY = (rows: number, kib: number) =>
  i18n.translate('xpack.cases.investigations.evidence.importFileSummary', {
    defaultMessage: '{rows, number} rows, {kib, number} KiB',
    values: { rows, kib },
  });

export const IMPORT_REMOVE_FILE = i18n.translate(
  'xpack.cases.investigations.evidence.importRemoveFile',
  {
    defaultMessage: 'Remove',
  }
);

export const IMPORT_PASTE_LABEL = i18n.translate(
  'xpack.cases.investigations.evidence.importPasteLabel',
  {
    defaultMessage: 'Or paste CSV',
  }
);

export const IMPORT_PASTE_PLACEHOLDER = i18n.translate(
  'xpack.cases.investigations.evidence.importPastePlaceholder',
  {
    defaultMessage: 'type,value,why\nIPv4,198.51.100.7,Beacon destination',
  }
);

export const IMPORT_EMPTY = i18n.translate('xpack.cases.investigations.evidence.importEmpty', {
  defaultMessage: 'Choose a file or paste CSV rows.',
});

export const IMPORT_TOO_LARGE = (mib: number) =>
  i18n.translate('xpack.cases.investigations.evidence.importTooLarge', {
    defaultMessage: 'The file is larger than {mib, number} MiB.',
    values: { mib },
  });

export const IMPORT_CREATED = (count: number) =>
  i18n.translate('xpack.cases.investigations.evidence.importCreated', {
    defaultMessage: 'Imported {count, plural, one {# indicator} other {# indicators}}',
    values: { count },
  });

export const IMPORT_CREATED_COUNT = (count: number) =>
  i18n.translate('xpack.cases.investigations.evidence.importCreatedCount', {
    defaultMessage: '{count, number} created',
    values: { count },
  });

export const IMPORT_DUPLICATES = (count: number) =>
  i18n.translate('xpack.cases.investigations.evidence.importDuplicates', {
    defaultMessage: '{count, number} duplicates skipped',
    values: { count },
  });

export const IMPORT_ERRORS = (count: number) =>
  i18n.translate('xpack.cases.investigations.evidence.importErrors', {
    defaultMessage: '{count, plural, one {# line} other {# lines}} with errors',
    values: { count },
  });

export const IMPORT_ERRORS_CAPTION = i18n.translate(
  'xpack.cases.investigations.evidence.importErrorsCaption',
  {
    defaultMessage: 'Lines that could not be imported',
  }
);

export const IMPORT_ERROR_LINE = i18n.translate(
  'xpack.cases.investigations.evidence.importErrorLine',
  {
    defaultMessage: 'Line',
  }
);

export const IMPORT_ERROR_MESSAGE = i18n.translate(
  'xpack.cases.investigations.evidence.importErrorMessage',
  {
    defaultMessage: 'Problem',
  }
);

export const IMPORT_MORE_ERRORS = (count: number) =>
  i18n.translate('xpack.cases.investigations.evidence.importMoreErrors', {
    defaultMessage: 'and {count, number} more lines with errors',
    values: { count },
  });

export const ALERT_LABEL = i18n.translate('xpack.cases.investigations.evidence.alertLabel', {
  defaultMessage: 'Alerts',
});

export const ALERT_HELP = i18n.translate('xpack.cases.investigations.evidence.alertHelp', {
  defaultMessage:
    'Newest alerts first. Select one or more. Indicators in the alerts are added automatically.',
});

export const ALERT_SEARCH_LABEL = i18n.translate(
  'xpack.cases.investigations.evidence.alertSearchLabel',
  {
    defaultMessage: 'Search alerts by rule name, host or user',
  }
);

export const ALERT_SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.cases.investigations.evidence.alertSearchPlaceholder',
  {
    defaultMessage: 'Search by rule name, host or user',
  }
);

export const ALERT_CHOOSE = i18n.translate('xpack.cases.investigations.evidence.alertChoose', {
  defaultMessage: 'Choose at least one alert.',
});

export const ALERT_NONE = i18n.translate('xpack.cases.investigations.evidence.alertNone', {
  defaultMessage: 'No alerts match',
});

export const ALERT_LOAD_ERROR = i18n.translate(
  'xpack.cases.investigations.evidence.alertLoadError',
  {
    defaultMessage: 'Could not search alerts',
  }
);

export const ALERTS_SELECTED = (count: number) =>
  i18n.translate('xpack.cases.investigations.evidence.alertsSelected', {
    defaultMessage: '{count, plural, one {# alert selected} other {# alerts selected}}',
    values: { count },
  });

export const QUERY_LABEL = i18n.translate('xpack.cases.investigations.evidence.queryLabel', {
  defaultMessage: 'ES|QL query',
});

export const QUERY_PLACEHOLDER = i18n.translate(
  'xpack.cases.investigations.evidence.queryPlaceholder',
  {
    defaultMessage: 'FROM logs-endpoint.events.process-*\n| WHERE host.name == "..."\n| LIMIT 100',
  }
);

export const QUERY_REQUIRED = i18n.translate('xpack.cases.investigations.evidence.queryRequired', {
  defaultMessage: 'Enter a query.',
});

export const QUERY_NOT_RUN = i18n.translate('xpack.cases.investigations.evidence.queryNotRun', {
  defaultMessage: 'Not run from here.',
});

export const QUERY_NOT_RUN_NOTE = i18n.translate(
  'xpack.cases.investigations.evidence.queryNotRunNote',
  {
    defaultMessage:
      'Run the query in Discover to see live results. Only the query text is kept here.',
  }
);

export const VISUALIZATION_LABEL = i18n.translate(
  'xpack.cases.investigations.evidence.visualizationLabel',
  {
    defaultMessage: 'Lens visualization',
  }
);

export const VISUALIZATION_CHOOSE = i18n.translate(
  'xpack.cases.investigations.evidence.visualizationChoose',
  {
    defaultMessage: 'Choose a visualization.',
  }
);

export const VISUALIZATION_NAME_REQUIRED = i18n.translate(
  'xpack.cases.investigations.evidence.visualizationNameRequired',
  {
    defaultMessage: 'Enter a name for the visualization.',
  }
);

export const VISUALIZATION_NAME_PLACEHOLDER = i18n.translate(
  'xpack.cases.investigations.evidence.visualizationNamePlaceholder',
  {
    defaultMessage: 'Example: Process starts by host, 7d',
  }
);

export const VISUALIZATION_NONE = i18n.translate(
  'xpack.cases.investigations.evidence.visualizationNone',
  {
    defaultMessage: 'No Lens visualizations found',
  }
);

export const VISUALIZATION_NONE_BODY = i18n.translate(
  'xpack.cases.investigations.evidence.visualizationNoneBody',
  {
    defaultMessage: 'Save a visualization in Lens to pick it here, or enter its name by hand.',
  }
);

export const FILE_LABEL = i18n.translate('xpack.cases.investigations.evidence.fileLabel', {
  defaultMessage: 'File',
});

export const FILE_HELP = i18n.translate('xpack.cases.investigations.evidence.fileHelp', {
  defaultMessage: 'Up to 100 MiB. A SHA-256 hash is computed on upload.',
});

export const FILE_PROMPT = i18n.translate('xpack.cases.investigations.evidence.filePrompt', {
  defaultMessage: 'Select or drag a file',
});

export const FILE_REQUIRED = i18n.translate('xpack.cases.investigations.evidence.fileRequired', {
  defaultMessage: 'Choose a file.',
});

export const FILE_TOO_LARGE = (mib: number) =>
  i18n.translate('xpack.cases.investigations.evidence.fileTooLarge', {
    defaultMessage: 'The file is larger than {mib, number} MiB.',
    values: { mib },
  });

export const UPLOADING = i18n.translate('xpack.cases.investigations.evidence.uploading', {
  defaultMessage: 'Uploading',
});

export const UPLOADING_TITLE = i18n.translate(
  'xpack.cases.investigations.evidence.uploadingTitle',
  {
    defaultMessage: 'Uploading the file',
  }
);

export const UPLOADING_BODY = i18n.translate('xpack.cases.investigations.evidence.uploadingBody', {
  defaultMessage: 'The file is stored and hashed. Large files take a moment.',
});

export const NOTE_LABEL = i18n.translate('xpack.cases.investigations.evidence.noteLabel', {
  defaultMessage: 'Observation',
});

export const NOTE_PLACEHOLDER = i18n.translate(
  'xpack.cases.investigations.evidence.notePlaceholder',
  {
    defaultMessage: 'What did you see?',
  }
);

export const NOTE_REQUIRED = i18n.translate('xpack.cases.investigations.evidence.noteRequired', {
  defaultMessage: 'Write your observation.',
});

export const CLOSE_EVIDENCE = i18n.translate('xpack.cases.investigations.evidence.closeEvidence', {
  defaultMessage: 'Close evidence',
});

export const BACK_TO_INVESTIGATION = i18n.translate(
  'xpack.cases.investigations.evidence.backToInvestigation',
  {
    defaultMessage: 'Back to investigation',
  }
);

export const OPEN_IN_ALERTS = i18n.translate('xpack.cases.investigations.evidence.openInAlerts', {
  defaultMessage: 'Open in Alerts',
});

export const OPEN_IN_CONVERSATION = i18n.translate(
  'xpack.cases.investigations.evidence.openInConversation',
  {
    defaultMessage: 'Open in Conversation',
  }
);

export const SOURCE_LABEL = (label: string) =>
  i18n.translate('xpack.cases.investigations.evidence.sourceLabel', {
    defaultMessage: 'Source: {label}',
    values: { label },
  });

export const TAB_DETAILS = i18n.translate('xpack.cases.investigations.evidence.tabDetails', {
  defaultMessage: 'Details',
});

export const TAB_COMMENTS = i18n.translate('xpack.cases.investigations.evidence.tabComments', {
  defaultMessage: 'Comments',
});

export const TAB_USED_IN = i18n.translate('xpack.cases.investigations.evidence.tabUsedIn', {
  defaultMessage: 'Used in',
});

export const EDIT_WHY = i18n.translate('xpack.cases.investigations.evidence.editWhy', {
  defaultMessage: 'Edit why it matters',
});

export const WHY_EMPTY = i18n.translate('xpack.cases.investigations.evidence.whyEmpty', {
  defaultMessage: 'Not explained yet. Say how this supports or weakens a conclusion.',
});

export const PRESERVED_COPY = i18n.translate('xpack.cases.investigations.evidence.preservedCopy', {
  defaultMessage: 'Preserved copy',
});

export const PRESERVED_SUMMARY_PREFIX = i18n.translate(
  'xpack.cases.investigations.evidence.preservedSummaryPrefix',
  {
    defaultMessage: 'Preserved copy, SHA-256 ',
  }
);

export const PRESERVED_ON = (date: string) =>
  i18n.translate('xpack.cases.investigations.evidence.preservedOn', {
    defaultMessage: 'preserved {date}',
    values: { date },
  });

export const NOT_PRESERVED = i18n.translate('xpack.cases.investigations.evidence.notPreserved', {
  defaultMessage:
    'No preserved copy yet. Without one, this item depends on the source data staying available.',
});

export const PRESERVE_A_COPY = i18n.translate('xpack.cases.investigations.evidence.preserveACopy', {
  defaultMessage: 'Preserve a copy',
});

export const SOURCE_EXPIRED_TITLE = i18n.translate(
  'xpack.cases.investigations.evidence.sourceExpiredTitle',
  {
    defaultMessage: 'The source data has expired',
  }
);

export const SOURCE_EXPIRED_BODY = i18n.translate(
  'xpack.cases.investigations.evidence.sourceExpiredBody',
  {
    defaultMessage: 'The source data has expired; this preserved copy is the record.',
  }
);

export const NOT_USED_IN_CLAIMS = i18n.translate(
  'xpack.cases.investigations.evidence.notUsedInClaims',
  {
    defaultMessage: 'No claim cites this evidence yet.',
  }
);

export const CLAIM_SUPPORTS = i18n.translate('xpack.cases.investigations.evidence.claimSupports', {
  defaultMessage: 'Supports',
});

export const CLAIM_OPPOSES = i18n.translate('xpack.cases.investigations.evidence.claimOpposes', {
  defaultMessage: 'Opposes',
});

export const COMMENTS_LOADING = i18n.translate(
  'xpack.cases.investigations.evidence.commentsLoading',
  {
    defaultMessage: 'Loading comments',
  }
);

export const NO_COMMENTS = i18n.translate('xpack.cases.investigations.evidence.noComments', {
  defaultMessage: 'No comments yet. Say why this evidence matters, or what to check next.',
});

export const ADD_COMMENT = i18n.translate('xpack.cases.investigations.evidence.addComment', {
  defaultMessage: 'Add a comment',
});

export const COMMENT = i18n.translate('xpack.cases.investigations.evidence.comment', {
  defaultMessage: 'Comment',
});

export const COMMENT_ADDED = i18n.translate('xpack.cases.investigations.evidence.commentAdded', {
  defaultMessage: 'Comment added.',
});

export const COMMENT_UPDATED = i18n.translate(
  'xpack.cases.investigations.evidence.commentUpdated',
  {
    defaultMessage: 'Comment updated.',
  }
);

export const COMMENT_DELETED = i18n.translate(
  'xpack.cases.investigations.evidence.commentDeleted',
  {
    defaultMessage: 'Comment deleted.',
  }
);

export const COMMENT_EDITED = i18n.translate('xpack.cases.investigations.evidence.commentEdited', {
  defaultMessage: '(edited)',
});

export const EDIT_COMMENT = i18n.translate('xpack.cases.investigations.evidence.editComment', {
  defaultMessage: 'Edit comment',
});

export const DELETE_COMMENT = i18n.translate('xpack.cases.investigations.evidence.deleteComment', {
  defaultMessage: 'Delete comment',
});

export const DELETE_COMMENT_TITLE = i18n.translate(
  'xpack.cases.investigations.evidence.deleteCommentTitle',
  {
    defaultMessage: 'Delete this comment?',
  }
);

export const DELETE_COMMENT_BODY = i18n.translate(
  'xpack.cases.investigations.evidence.deleteCommentBody',
  {
    defaultMessage: 'The comment is removed for everyone. This cannot be undone.',
  }
);

export const DOCUMENT_VIEW = i18n.translate('xpack.cases.investigations.evidence.documentView', {
  defaultMessage: 'Document view',
});

export const VIEW_TABLE = i18n.translate('xpack.cases.investigations.evidence.viewTable', {
  defaultMessage: 'Table',
});

export const VIEW_JSON = i18n.translate('xpack.cases.investigations.evidence.viewJson', {
  defaultMessage: 'JSON',
});

export const NO_FIELDS = i18n.translate('xpack.cases.investigations.evidence.noFields', {
  defaultMessage: 'No fields were preserved.',
});

export const NO_ROWS = i18n.translate('xpack.cases.investigations.evidence.noRows', {
  defaultMessage: 'No rows',
});

export const DETAIL_RISK_SCORE = i18n.translate(
  'xpack.cases.investigations.evidence.detailRiskScore',
  {
    defaultMessage: 'Risk score',
  }
);

export const DETAIL_HOST = i18n.translate('xpack.cases.investigations.evidence.detailHost', {
  defaultMessage: 'Host',
});

export const DETAIL_USER = i18n.translate('xpack.cases.investigations.evidence.detailUser', {
  defaultMessage: 'User',
});

export const DETAIL_ABOUT = i18n.translate('xpack.cases.investigations.evidence.detailAbout', {
  defaultMessage: 'About',
});

export const DETAIL_RULE_DESCRIPTION = i18n.translate(
  'xpack.cases.investigations.evidence.detailRuleDescription',
  {
    defaultMessage: 'Rule description',
  }
);

export const DETAIL_ALERT_REASON = i18n.translate(
  'xpack.cases.investigations.evidence.detailAlertReason',
  {
    defaultMessage: 'Alert reason',
  }
);

export const DETAIL_THREAT_MAPPING = i18n.translate(
  'xpack.cases.investigations.evidence.detailThreatMapping',
  {
    defaultMessage: 'Threat mapping',
  }
);

export const DETAIL_HIGHLIGHTED_FIELDS = i18n.translate(
  'xpack.cases.investigations.evidence.detailHighlightedFields',
  {
    defaultMessage: 'Highlighted fields',
  }
);

export const DETAIL_DOCUMENT = i18n.translate(
  'xpack.cases.investigations.evidence.detailDocument',
  {
    defaultMessage: 'Document',
  }
);

export const DETAIL_ENTITY_RECORD = i18n.translate(
  'xpack.cases.investigations.evidence.detailEntityRecord',
  {
    defaultMessage: 'Entity store record',
  }
);

export const DETAIL_RISK_CONTRIBUTIONS = i18n.translate(
  'xpack.cases.investigations.evidence.detailRiskContributions',
  {
    defaultMessage: 'Risk contributions',
  }
);

export const DETAIL_FACTS = i18n.translate('xpack.cases.investigations.evidence.detailFacts', {
  defaultMessage: 'Facts',
});

export const DETAIL_THREAT_INTEL = i18n.translate(
  'xpack.cases.investigations.evidence.detailThreatIntel',
  {
    defaultMessage: 'Threat intelligence',
  }
);

export const DETAIL_NO_INTEL = i18n.translate('xpack.cases.investigations.evidence.detailNoIntel', {
  defaultMessage: 'Threat intelligence does not apply to this indicator.',
});

export const DETAIL_SIGHTINGS = i18n.translate(
  'xpack.cases.investigations.evidence.detailSightings',
  {
    defaultMessage: 'Seen in this environment',
  }
);

export const DETAIL_NOT_OBSERVED = i18n.translate(
  'xpack.cases.investigations.evidence.detailNotObserved',
  {
    defaultMessage: 'Not observed yet.',
  }
);

export const DETAIL_SEEN_ELSEWHERE = i18n.translate(
  'xpack.cases.investigations.evidence.detailSeenElsewhere',
  {
    defaultMessage: 'Seen in other investigations',
  }
);

export const DETAIL_QUERY = i18n.translate('xpack.cases.investigations.evidence.detailQuery', {
  defaultMessage: 'ES|QL query',
});

export const DETAIL_RESULTS = i18n.translate('xpack.cases.investigations.evidence.detailResults', {
  defaultMessage: 'Results',
});

export const DETAIL_RESULTS_PREVIEW = i18n.translate(
  'xpack.cases.investigations.evidence.detailResultsPreview',
  {
    defaultMessage: 'Results preview',
  }
);

export const DETAIL_FINDING = i18n.translate('xpack.cases.investigations.evidence.detailFinding', {
  defaultMessage: 'Check result',
});

export const DETAIL_CHECKED = i18n.translate('xpack.cases.investigations.evidence.detailChecked', {
  defaultMessage: 'What was checked',
});

export const DETAIL_SYSTEM = i18n.translate('xpack.cases.investigations.evidence.detailSystem', {
  defaultMessage: 'System',
});

export const DETAIL_CHECK = i18n.translate('xpack.cases.investigations.evidence.detailCheck', {
  defaultMessage: 'Check',
});

export const DETAIL_RESULT = i18n.translate('xpack.cases.investigations.evidence.detailResult', {
  defaultMessage: 'Result',
});

export const DETAIL_FILE = i18n.translate('xpack.cases.investigations.evidence.detailFile', {
  defaultMessage: 'File',
});

export const DETAIL_FILE_NAME = i18n.translate(
  'xpack.cases.investigations.evidence.detailFileName',
  {
    defaultMessage: 'Name',
  }
);

export const DETAIL_FILE_SIZE = i18n.translate(
  'xpack.cases.investigations.evidence.detailFileSize',
  {
    defaultMessage: 'Size',
  }
);

export const DETAIL_FILE_TYPE = i18n.translate(
  'xpack.cases.investigations.evidence.detailFileType',
  {
    defaultMessage: 'Type',
  }
);

export const DETAIL_FILE_SHA256 = i18n.translate(
  'xpack.cases.investigations.evidence.detailFileSha256',
  {
    defaultMessage: 'SHA-256',
  }
);

export const DETAIL_NOTE = i18n.translate('xpack.cases.investigations.evidence.detailNote', {
  defaultMessage: 'Note',
});

export const DETAIL_SAVED_SEARCH_PRESERVED = i18n.translate(
  'xpack.cases.investigations.evidence.detailSavedSearchPreserved',
  {
    defaultMessage:
      'A preserved copy of the results is kept, so this stays readable after the source data ages out.',
  }
);

export const DETAIL_VISUALIZATION_APP = i18n.translate(
  'xpack.cases.investigations.evidence.detailVisualizationApp',
  {
    defaultMessage: 'Application',
  }
);

export const DETAIL_IN_CONVERSATION = i18n.translate(
  'xpack.cases.investigations.evidence.detailInConversation',
  {
    defaultMessage: 'In the conversation',
  }
);

export const DETAIL_NO_PRESERVED = i18n.translate(
  'xpack.cases.investigations.evidence.detailNoPreserved',
  {
    defaultMessage: 'No details were preserved for this item.',
  }
);
