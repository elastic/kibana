/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const CONFIRM_TITLE = (count: number) =>
  i18n.translate('xpack.cases.agentBuilder.mergeCases.confirmation.title', {
    defaultMessage: 'Merge {count} cases?',
    values: { count },
  });

export const CONFIRM_TEXT = i18n.translate(
  'xpack.cases.agentBuilder.mergeCases.confirmation.confirmText',
  { defaultMessage: 'Merge' }
);

export const CANCEL_TEXT = i18n.translate(
  'xpack.cases.agentBuilder.mergeCases.confirmation.cancelText',
  { defaultMessage: 'Cancel' }
);

export const CONFIRM_CASES = (cases: string) =>
  i18n.translate('xpack.cases.agentBuilder.mergeCases.confirmation.cases', {
    defaultMessage: '**Cases:** {cases}',
    values: { cases },
  });

export const CONFIRM_INTO_NEW_CASE = (title: string) =>
  i18n.translate('xpack.cases.agentBuilder.mergeCases.confirmation.intoNewCase', {
    defaultMessage: '**Into:** a new case, "{title}"',
    values: { title },
  });

export const CONFIRM_INTO_EXISTING_CASE = (caseRef: string) =>
  i18n.translate('xpack.cases.agentBuilder.mergeCases.confirmation.intoExistingCase', {
    defaultMessage: '**Into:** {caseRef}',
    values: { caseRef },
  });

export const CONFIRM_COPIES = (items: string) =>
  i18n.translate('xpack.cases.agentBuilder.mergeCases.confirmation.copies', {
    defaultMessage: '**Copies:** {items}',
    values: { items },
  });

export const CONFIRM_NOTHING_TO_COPY = i18n.translate(
  'xpack.cases.agentBuilder.mergeCases.confirmation.nothingToCopy',
  { defaultMessage: '**Copies:** nothing new' }
);

export const CONFIRM_LEFT_OUT = (items: string) =>
  i18n.translate('xpack.cases.agentBuilder.mergeCases.confirmation.leftOut', {
    defaultMessage: '**Stays on the source cases:** {items}',
    values: { items },
  });

export const CONFIRM_CLOSES = (cases: string) =>
  i18n.translate('xpack.cases.agentBuilder.mergeCases.confirmation.closes', {
    defaultMessage: '**Closes:** {cases}',
    values: { cases },
  });

export const CONFIRM_CLOSES_NONE = i18n.translate(
  'xpack.cases.agentBuilder.mergeCases.confirmation.closesNone',
  { defaultMessage: '**Closes:** no cases' }
);

export const ITEM_COUNTS: Record<string, (count: number) => string> = {
  alerts: (count) =>
    i18n.translate('xpack.cases.agentBuilder.mergeCases.items.alerts', {
      defaultMessage: '{count, plural, one {# alert} other {# alerts}}',
      values: { count },
    }),
  events: (count) =>
    i18n.translate('xpack.cases.agentBuilder.mergeCases.items.events', {
      defaultMessage: '{count, plural, one {# event} other {# events}}',
      values: { count },
    }),
  attacks: (count) =>
    i18n.translate('xpack.cases.agentBuilder.mergeCases.items.attacks', {
      defaultMessage: '{count, plural, one {# attack} other {# attacks}}',
      values: { count },
    }),
  observables: (count) =>
    i18n.translate('xpack.cases.agentBuilder.mergeCases.items.observables', {
      defaultMessage: '{count, plural, one {# observable} other {# observables}}',
      values: { count },
    }),
  other: (count) =>
    i18n.translate('xpack.cases.agentBuilder.mergeCases.items.other', {
      defaultMessage: '{count, plural, one {# other attachment} other {# other attachments}}',
      values: { count },
    }),
  files: (count) =>
    i18n.translate('xpack.cases.agentBuilder.mergeCases.items.files', {
      defaultMessage: '{count, plural, one {# file} other {# files}}',
      values: { count },
    }),
  comments: (count) =>
    i18n.translate('xpack.cases.agentBuilder.mergeCases.items.comments', {
      defaultMessage: '{count, plural, one {# comment} other {# comments}}',
      values: { count },
    }),
};
