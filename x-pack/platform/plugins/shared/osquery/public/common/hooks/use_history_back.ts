/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { AppHeaderBack } from '@kbn/app-header';
import { useRouterNavigate } from '../lib/kibana';
import { getHistoryFilters } from '../../actions/history_filter_storage';

const HISTORY_PATH = 'history';

/**
 * `AppHeaderBack` target pointing at the History list, reused by `MainNavigation` and by the
 * results pages (`routes/live_queries/details`, `routes/history/scheduled_execution_details`)
 * that own their own `AppHeader`. Keeps the persisted History filters (if any) in the link, same
 * as the History tab itself.
 */
export const useHistoryBack = (): AppHeaderBack => {
  const persistedHistoryQs = getHistoryFilters();
  const historyPath = persistedHistoryQs ? `${HISTORY_PATH}${persistedHistoryQs}` : HISTORY_PATH;
  const { href } = useRouterNavigate(historyPath);
  const label = i18n.translate('xpack.osquery.appNavigation.historyLinkText', {
    defaultMessage: 'History',
  });

  return useMemo(() => ({ href, label }), [href, label]);
};
