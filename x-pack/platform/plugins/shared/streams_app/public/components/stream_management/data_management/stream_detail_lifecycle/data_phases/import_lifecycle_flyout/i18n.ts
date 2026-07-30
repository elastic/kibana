/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const importLifecycleFlyoutI18n = {
  title: i18n.translate('xpack.streams.importLifecycle.title', {
    defaultMessage: 'Import from another stream',
  }),
  searchPlaceholder: i18n.translate('xpack.streams.importLifecycle.searchPlaceholder', {
    defaultMessage: 'Search by stream name',
  }),
  inspectButtonLabel: (name: string) =>
    i18n.translate('xpack.streams.importLifecycle.inspectButtonLabel', {
      defaultMessage: 'Inspect ILM policy for {name}',
      values: { name },
    }),
  methodFilterDlm: i18n.translate('xpack.streams.importLifecycle.methodFilter.dlm', {
    defaultMessage: 'Data stream lifecycle',
  }),
  methodFilterIlm: i18n.translate('xpack.streams.importLifecycle.methodFilter.ilm', {
    defaultMessage: 'ILM policy',
  }),
  methodFilterButtonLabel: i18n.translate(
    'xpack.streams.importLifecycle.methodFilter.buttonLabel',
    {
      defaultMessage: 'Method',
    }
  ),
  methodFilterPopoverAriaLabel: i18n.translate(
    'xpack.streams.importLifecycle.methodFilter.popoverAriaLabel',
    {
      defaultMessage: 'Method filter',
    }
  ),
  methodFilterSelectableAriaLabel: i18n.translate(
    'xpack.streams.importLifecycle.methodFilter.selectableAriaLabel',
    {
      defaultMessage: 'Filter by method',
    }
  ),
};
