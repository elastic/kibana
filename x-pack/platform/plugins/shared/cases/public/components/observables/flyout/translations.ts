/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/** `<canonical name>: <value>`, the history title shape of the Security flyout v2. */
export const formatFlyoutTitle = (canonicalName: string, value?: string): string =>
  value ? `${canonicalName}: ${value}` : canonicalName;

export const OBSERVABLE_TITLE = i18n.translate('xpack.cases.caseView.observables.flyout.title', {
  defaultMessage: 'Observable',
});

export const OBSERVABLE_CASES_TITLE = i18n.translate(
  'xpack.cases.caseView.observables.flyout.casesTitle',
  { defaultMessage: 'Cases with this observable' }
);

export const LOADING = i18n.translate('xpack.cases.caseView.observables.flyout.loading', {
  defaultMessage: 'Loading',
});

export const CASE_FIELDS_SECTION = i18n.translate(
  'xpack.cases.caseView.observables.flyout.caseFieldsSection',
  { defaultMessage: 'In this case' }
);

export const CASE_FIELDS_HELP = i18n.translate(
  'xpack.cases.caseView.observables.flyout.caseFieldsHelp',
  {
    defaultMessage:
      'Specific to this observable in this case. Other cases that hold it keep their own description and dates.',
  }
);

export const SHARED_FIELDS_SECTION = i18n.translate(
  'xpack.cases.caseView.observables.flyout.sharedFieldsSection',
  { defaultMessage: 'Shared across cases' }
);

export const SHARED_FIELDS_HELP = i18n.translate(
  'xpack.cases.caseView.observables.flyout.sharedFieldsHelp',
  {
    defaultMessage:
      'The same in every case in this space that holds this observable. Changing it in one case changes it in all of them.',
  }
);

export const COPY_LINK = i18n.translate('xpack.cases.caseView.observables.flyout.copyLink', {
  defaultMessage: 'Copy link to this observable',
});

export const LINK_COPIED = i18n.translate('xpack.cases.caseView.observables.flyout.linkCopied', {
  defaultMessage: 'Link to the observable copied',
});

export const TAKE_ACTION = i18n.translate('xpack.cases.caseView.observables.flyout.takeAction', {
  defaultMessage: 'Take action',
});

export const INSIGHTS_SECTION = i18n.translate(
  'xpack.cases.caseView.observables.flyout.insightsSection',
  { defaultMessage: 'Insights' }
);

export const DESCRIPTION = i18n.translate('xpack.cases.caseView.observables.flyout.description', {
  defaultMessage: 'Description',
});

export const DATE_ADDED = i18n.translate('xpack.cases.caseView.observables.flyout.dateAdded', {
  defaultMessage: 'Date added',
});

export const LAST_UPDATED = i18n.translate('xpack.cases.caseView.observables.flyout.lastUpdated', {
  defaultMessage: 'Last updated',
});

export const NO_SHARED_METADATA = i18n.translate(
  'xpack.cases.caseView.observables.flyout.noSharedMetadata',
  { defaultMessage: 'No shared metadata. Edit the observable to add key and value pairs.' }
);

export const CASES_PANEL_TITLE = i18n.translate(
  'xpack.cases.caseView.observables.flyout.casesPanelTitle',
  { defaultMessage: 'Cases' }
);

export const CASES_PANEL_TOOLTIP = i18n.translate(
  'xpack.cases.caseView.observables.flyout.casesPanelTooltip',
  { defaultMessage: 'Show all related cases' }
);

export const RELATED_CASES = (count: number) =>
  i18n.translate('xpack.cases.caseView.observables.flyout.relatedCases', {
    values: { count },
    defaultMessage: 'Related {count, plural, one {case} other {cases}}',
  });

export const SHOW_DETAILS = i18n.translate('xpack.cases.caseView.observables.flyout.showDetails', {
  defaultMessage: 'Click to see more details',
});

export const OTHER_CASES_ERROR = i18n.translate(
  'xpack.cases.caseView.observables.flyout.otherCasesError',
  { defaultMessage: 'The cases with this observable could not be loaded.' }
);

export const CASES_TABLE_CAPTION = i18n.translate(
  'xpack.cases.caseView.observables.flyout.casesTableCaption',
  { defaultMessage: 'Other cases with this observable' }
);

export const CASES_LIST_CAPPED_TITLE = (count: number) =>
  i18n.translate('xpack.cases.caseView.observables.flyout.casesListCappedTitle', {
    values: { count },
    defaultMessage: 'Showing {count, plural, one {# case} other {# cases}}, not all of them',
  });

export const CASES_LIST_CAPPED_DESCRIPTION = i18n.translate(
  'xpack.cases.caseView.observables.flyout.casesListCappedDescription',
  {
    defaultMessage:
      'More cases have this observable than the list can hold. It keeps the cases that added it most recently.',
  }
);

export const NO_CASES = i18n.translate('xpack.cases.caseView.observables.flyout.noCases', {
  defaultMessage: 'No other cases have this observable.',
});
