/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ATTACHMENT_SUMMARY_TITLE = i18n.translate('xpack.alertzero.attachmentSummary.title', {
  defaultMessage: 'Attachment summary',
});

export const ATTACHMENT_SUMMARY_SHOW_LESS = i18n.translate(
  'xpack.alertzero.attachmentSummary.showLess',
  { defaultMessage: 'Show less' }
);

/**
 * The kind is spelled out because the avatar only conveys it visually, and it would otherwise be
 * dropped from the accessible name once the row's own label takes over.
 */
export const attachmentSummaryRowAriaLabel = (typeName: string, label: string) =>
  i18n.translate('xpack.alertzero.attachmentSummary.rowAriaLabel', {
    defaultMessage: '{typeName}: {label}',
    values: { typeName, label },
  });

/** The `+` is the expand affordance; collapsing has none, so "Show less" carries no counterpart. */
export const attachmentSummaryShowMore = (count: number) =>
  i18n.translate('xpack.alertzero.attachmentSummary.showMore', {
    defaultMessage: '+ Show more ({count})',
    values: { count },
  });
