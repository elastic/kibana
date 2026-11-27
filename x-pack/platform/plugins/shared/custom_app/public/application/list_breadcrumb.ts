/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, type MouseEvent } from 'react';
import { useHistory } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import type { AppHeaderBack } from '@kbn/app-header';

/**
 * The way back to the list, for the header of a page and for the breadcrumbs of Kibana: a real
 * link, so that it can be opened in another tab, and a plain click stays in the app. It asks first,
 * through the history, when there are unsaved changes.
 */
export const useListBack = (): AppHeaderBack => {
  const history = useHistory();
  return useMemo(
    () => ({
      label: i18n.translate('xpack.customApp.standalone.breadcrumb', {
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

/** The same way back, as the first breadcrumb of Kibana. */
export const useListBreadcrumb = () => {
  const { label, href, onClick } = useListBack();
  return useMemo(() => ({ text: label, href, onClick }), [label, href, onClick]);
};
