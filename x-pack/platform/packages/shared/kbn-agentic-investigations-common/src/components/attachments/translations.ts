/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ATTACHMENTS_TAB_TITLE = i18n.translate('xpack.alertzero.attachments.tabTitle', {
  defaultMessage: 'Attachments',
});

export const ATTACHMENTS_EMPTY_MESSAGE = i18n.translate(
  'xpack.alertzero.attachments.emptyMessage',
  { defaultMessage: 'No attachments' }
);

export const ATTACHMENT_GROUP_SHOW_LESS = i18n.translate(
  'xpack.alertzero.attachments.groupShowLess',
  { defaultMessage: 'Show less' }
);

/**
 * The kind is spelled out because the icon only conveys it visually, and it would otherwise be
 * dropped from the accessible name once the row's own label takes over.
 */
export const attachmentRowAriaLabel = (typeName: string, label: string) =>
  i18n.translate('xpack.alertzero.attachments.rowAriaLabel', {
    defaultMessage: '{typeName}: {label}',
    values: { typeName, label },
  });

export const attachmentGroupShowMore = (count: number) =>
  i18n.translate('xpack.alertzero.attachments.groupShowMore', {
    defaultMessage: 'Show more ({count})',
    values: { count },
  });
