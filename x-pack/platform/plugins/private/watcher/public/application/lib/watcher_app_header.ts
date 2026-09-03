/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppHeaderBack } from '@kbn/app-header';
import type { ScopedHistory } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';

export const watcherPageTitle = i18n.translate('xpack.watcher.sections.watchList.header', {
  defaultMessage: 'Watcher',
});

export const watcherPageDescription = i18n.translate('xpack.watcher.sections.watchList.subhead', {
  defaultMessage: 'Watch for changes or anomalies in your data and take action if needed.',
});

export const getWatcherListBack = (history: Pick<ScopedHistory, 'createHref'>): AppHeaderBack => ({
  href: history.createHref({ pathname: '/watches' }),
  label: watcherPageTitle,
});
