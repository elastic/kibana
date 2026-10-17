/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, type MouseEvent } from 'react';
import { useHistory } from 'react-router-dom';
import { i18n } from '@kbn/i18n';

/**
 * The way back to the list, as a breadcrumb: a real link, so that it can be opened in another tab,
 * and a plain click stays in the app. It asks first, through the history, when there are unsaved
 * changes.
 */
export const useListBreadcrumb = () => {
  const history = useHistory();
  return useMemo(
    () => ({
      text: i18n.translate('xpack.customApp.standalone.breadcrumb', {
        defaultMessage: 'Custom apps',
      }),
      href: history.createHref({ pathname: '/' }),
      onClick: (event: MouseEvent) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
        event.preventDefault();
        history.push('/');
      },
    }),
    [history]
  );
};
