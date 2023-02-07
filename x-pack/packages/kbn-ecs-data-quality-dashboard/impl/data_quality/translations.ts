/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ADD_TO_NEW_CASE = i18n.translate('ecsDataQualityDashboard.addToNewCaseButton', {
  defaultMessage: 'Add to new case',
});

export const CANCEL = i18n.translate('ecsDataQualityDashboard.cancelButton', {
  defaultMessage: 'Cancel',
});

export const CHECK_ALL = i18n.translate('ecsDataQualityDashboard.checkAllButton', {
  defaultMessage: 'Check all',
});

export const CHECKING = (index: string) =>
  i18n.translate('ecsDataQualityDashboard.checkingLabel', {
    values: { index },
    defaultMessage: 'Checking {index}',
  });

export const COLLAPSE_BUTTON_LABEL = (collapsed: boolean) =>
  collapsed
    ? i18n.translate('ecsDataQualityDashboard.collapseButtonLabelOpen', {
        defaultMessage: 'Open',
      })
    : i18n.translate('ecsDataQualityDashboard.collapseButtonLabelClosed', {
        defaultMessage: 'Closed',
      });

export const COLD_DESCRIPTION = i18n.translate('ecsDataQualityDashboard.coldDescription', {
  defaultMessage:
    'The index is no longer being updated and is queried infrequently. The information still needs to be searchable, but it’s okay if those queries are slower.',
});

export const COLD_PATTERN_TOOLTIP = ({ indices, pattern }: { indices: number; pattern: string }) =>
  i18n.translate('ecsDataQualityDashboard.coldPatternTooltip', {
    values: { indices, pattern },
    defaultMessage:
      '{indices} {indices, plural, =1 {index} other {indices}} matching the {pattern} pattern {indices, plural, =1 {is} other {are}} cold. Cold indices are no longer being updated and are queried infrequently. The information still needs to be searchable, but it’s okay if those queries are slower.',
  });

export const COPIED_RESULTS_TOAST_TITLE = i18n.translate(
  'ecsDataQualityDashboard.toasts.copiedResultsToastTitle',
  {
    defaultMessage: 'Copied results to the clipboard',
  }
);

export const COPY_TO_CLIPBOARD = i18n.translate('ecsDataQualityDashboard.copyToClipboardButton', {
  defaultMessage: 'Copy to clipboard',
});

/** The subtitle displayed on the Data Quality dashboard */
export const DATA_QUALITY_SUBTITLE: string = i18n.translate(
  'ecsDataQualityDashboard.ecsDataQualityDashboardSubtitle',
  {
    defaultMessage: 'Check index mappings and values for compatibility with the',
  }
);

export const DATA_QUALITY_TITLE = i18n.translate(
  'ecsDataQualityDashboard.ecsDataQualityDashboardTitle',
  {
    defaultMessage: 'Data quality',
  }
);

export const DEFAULT_PANEL_TITLE = i18n.translate('ecsDataQualityDashboard.defaultPanelTitle', {
  defaultMessage: 'Check index mappings',
});

export const ECS_VERSION = i18n.translate('ecsDataQualityDashboard.ecsVersionStat', {
  defaultMessage: 'ECS version',
});

export const ERROR_LOADING_ECS_METADATA = (details: string) =>
  i18n.translate('ecsDataQualityDashboard.errorLoadingEcsMetadataLabel', {
    values: { details },
    defaultMessage: 'Error loading ECS metadata: {details}',
  });

export const ERROR_LOADING_ECS_METADATA_TITLE = i18n.translate(
  'ecsDataQualityDashboard.emptyErrorPrompt.errorLoadingEcsMetadataTitle',
  {
    defaultMessage: 'Unable to load ECS metadata',
  }
);

export const ERROR_LOADING_ECS_VERSION = (details: string) =>
  i18n.translate('ecsDataQualityDashboard.errorLoadingEcsVersionLabel', {
    values: { details },
    defaultMessage: 'Error loading ECS version: {details}',
  });

export const ERROR_LOADING_ECS_VERSION_TITLE = i18n.translate(
  'ecsDataQualityDashboard.emptyErrorPrompt.errorLoadingEcsVersionTitle',
  {
    defaultMessage: 'Unable to load ECS version',
  }
);

export const ERROR_LOADING_ILM_EXPLAIN = (details: string) =>
  i18n.translate('ecsDataQualityDashboard.errorLoadingIlmExplainLabel', {
    values: { details },
    defaultMessage: 'Error loading ILM Explain: {details}',
  });

export const ERROR_LOADING_MAPPINGS = ({
  details,
  patternOrIndexName,
}: {
  details: string;
  patternOrIndexName: string;
}) =>
  i18n.translate('ecsDataQualityDashboard.errorLoadingMappingsLabel', {
    values: { details, patternOrIndexName },
    defaultMessage: 'Error loading mappings for {patternOrIndexName}: {details}',
  });

export const ERROR_LOADING_STATS = (details: string) =>
  i18n.translate('ecsDataQualityDashboard.errorLoadingStatsLabel', {
    values: { details },
    defaultMessage: 'Error loading stats: {details}',
  });

export const ERROR_LOADING_UNALLOWED_VALUES = ({
  details,
  indexName,
}: {
  details: string;
  indexName: string;
}) =>
  i18n.translate('ecsDataQualityDashboard.errorLoadingUnallowedValuesLabel', {
    values: { details, indexName },
    defaultMessage: 'Error loading unallowed values for index {indexName}: {details}',
  });

export const FIELDS = i18n.translate('ecsDataQualityDashboard.fieldsLabel', {
  defaultMessage: 'Fields',
});

export const FROZEN_DESCRIPTION = i18n.translate('ecsDataQualityDashboard.frozenDescription', {
  defaultMessage: `The index is no longer being updated and is queried rarely. The information still needs to be searchable, but it's okay if those queries are extremely slow.`,
});

export const FROZEN_PATTERN_TOOLTIP = ({
  indices,
  pattern,
}: {
  indices: number;
  pattern: string;
}) =>
  i18n.translate('ecsDataQualityDashboard.frozenPatternTooltip', {
    values: { indices, pattern },
    defaultMessage: `{indices} {indices, plural, =1 {index} other {indices}} matching the {pattern} pattern {indices, plural, =1 {is} other {are}} frozen. Frozen indices are no longer being updated and are queried rarely. The information still needs to be searchable, but it's okay if those queries are extremely slow.`,
  });

export const HOT_DESCRIPTION = i18n.translate('ecsDataQualityDashboard.hotDescription', {
  defaultMessage: 'The index is actively being updated and queried',
});

export const HOT_PATTERN_TOOLTIP = ({ indices, pattern }: { indices: number; pattern: string }) =>
  i18n.translate('ecsDataQualityDashboard.hotPatternTooltip', {
    values: { indices, pattern },
    defaultMessage:
      '{indices} {indices, plural, =1 {index} other {indices}} matching the {pattern} pattern {indices, plural, =1 {is} other {are}} hot. Hot indices are actively being updated and queried.',
  });

/** The tooltip for the `ILM phase` combo box on the Data Quality Dashboard */
export const INDEX_LIFECYCLE_MANAGEMENT_PHASES: string = i18n.translate(
  'ecsDataQualityDashboard.indexLifecycleManagementPhasesTooltip',
  {
    defaultMessage:
      'Indices with these Index Lifecycle Management (ILM) phases will be checked for data quality',
  }
);

export const INDEX_NAME = i18n.translate('ecsDataQualityDashboard.indexNameLabel', {
  defaultMessage: 'Index name',
});

/** The label displayed for the `ILM phase` combo box on the Data Quality dashboard */
export const ILM_PHASE: string = i18n.translate('ecsDataQualityDashboard.ilmPhaseLabel', {
  defaultMessage: 'ILM phase',
});

export const LAST_CHECKED = i18n.translate('ecsDataQualityDashboard.lastCheckedLabel', {
  defaultMessage: 'Last checked',
});

export const LOADING_ECS_METADATA = i18n.translate(
  'ecsDataQualityDashboard.emptyLoadingPrompt.loadingEcsMetadataPrompt',
  {
    defaultMessage: 'Loading ECS metadata',
  }
);

export const SELECT_AN_INDEX = i18n.translate('ecsDataQualityDashboard.selectAnIndexPrompt', {
  defaultMessage: 'Select an index to compare it against ECS version',
});

/** The placeholder for the `ILM phase` combo box on the Data Quality Dashboard */
export const SELECT_ONE_OR_MORE_ILM_PHASES: string = i18n.translate(
  'ecsDataQualityDashboard.selectOneOrMorPhasesPlaceholder',
  {
    defaultMessage: 'Select one or more ILM phases',
  }
);

export const TECHNICAL_PREVIEW = i18n.translate('ecsDataQualityDashboard.technicalPreviewBadge', {
  defaultMessage: 'Technical preview',
});

export const TIMESTAMP_DESCRIPTION = i18n.translate(
  'ecsDataQualityDashboard.timestampDescriptionLabel',
  {
    defaultMessage:
      'Date/time when the event originated. This is the date/time extracted from the event, typically representing when the event was generated by the source. If the event source has no original timestamp, this value is typically populated by the first time the event was received by the pipeline. Required field for all events.',
  }
);

export const UNMANAGED_DESCRIPTION = i18n.translate(
  'ecsDataQualityDashboard.unmanagedDescription',
  {
    defaultMessage: `The index isn't managed by Index Lifecycle Management (ILM)`,
  }
);

export const UNMANAGED_PATTERN_TOOLTIP = ({
  indices,
  pattern,
}: {
  indices: number;
  pattern: string;
}) =>
  i18n.translate('ecsDataQualityDashboard.unmanagedPatternTooltip', {
    values: { indices, pattern },
    defaultMessage: `{indices} {indices, plural, =1 {index} other {indices}} matching the {pattern} pattern {indices, plural, =1 {is} other {are}} unmanaged by Index Lifecycle Management (ILM)`,
  });

export const WARM_DESCRIPTION = i18n.translate('ecsDataQualityDashboard.warmDescription', {
  defaultMessage: 'The index is no longer being updated but is still being queried',
});

export const WARM_PATTERN_TOOLTIP = ({ indices, pattern }: { indices: number; pattern: string }) =>
  i18n.translate('ecsDataQualityDashboard.warmPatternTooltip', {
    values: { indices, pattern },
    defaultMessage:
      '{indices} {indices, plural, =1 {index} other {indices}} matching the {pattern} pattern {indices, plural, =1 {is} other {are}} warm. Warm indices are no longer being updated but are still being queried.',
  });
