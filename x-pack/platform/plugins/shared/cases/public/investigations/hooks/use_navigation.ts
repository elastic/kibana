/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import type { ChromeBreadcrumb } from '@kbn/core/public';
import { INVESTIGATIONS_APP_ID } from '../../../common/investigations/constants';
import { useInvestigationsServices } from '../services';
import { APP_TITLE } from '../translations';

/**
 * Sets the chrome breadcrumbs and the document title: "Investigations" on the queue and
 * "Investigations > INV-218" on a record.
 */
export const useInvestigationBreadcrumbs = (recordLabel?: string): void => {
  const { chrome, application } = useInvestigationsServices();
  const history = useHistory();

  useEffect(() => {
    const queueHref = application.getUrlForApp(INVESTIGATIONS_APP_ID);
    const breadcrumbs: ChromeBreadcrumb[] = recordLabel
      ? [
          {
            text: APP_TITLE,
            href: queueHref,
            onClick: (event) => {
              event.preventDefault();
              history.push('/');
            },
          },
          { text: recordLabel },
        ]
      : [{ text: APP_TITLE }];

    chrome.setBreadcrumbs(breadcrumbs);
    chrome.docTitle.change(recordLabel ? [recordLabel, APP_TITLE] : [APP_TITLE]);
  }, [application, chrome, history, recordLabel]);
};

export interface InvestigationsNavigation {
  /** Path inside the app, for example `/<id>?tab=scope`. */
  getRecordPath: (recordId: string, options?: { tab?: string; itemId?: string }) => string;
  /** A full href for links, so that they can be opened in a new tab. */
  getHref: (path: string) => string;
  navigate: (path: string) => void;
  goToRecord: (recordId: string, options?: { tab?: string; itemId?: string }) => void;
  goToQueue: () => void;
}

export const useInvestigationsNavigation = (): InvestigationsNavigation => {
  const history = useHistory();

  const getRecordPath = useCallback(
    (recordId: string, options?: { tab?: string; itemId?: string }) => {
      const params = new URLSearchParams();
      if (options?.tab && options.tab !== 'overview') {
        params.set('tab', options.tab);
      }
      if (options?.itemId) {
        params.set('item', options.itemId);
      }
      const query = params.toString();
      return `/${encodeURIComponent(recordId)}${query ? `?${query}` : ''}`;
    },
    []
  );

  const getHref = useCallback((path: string) => history.createHref(toLocation(path)), [history]);
  const navigate = useCallback((path: string) => history.push(path), [history]);
  const goToRecord = useCallback(
    (recordId: string, options?: { tab?: string; itemId?: string }) =>
      history.push(getRecordPath(recordId, options)),
    [getRecordPath, history]
  );
  const goToQueue = useCallback(() => history.push('/'), [history]);

  return { getRecordPath, getHref, navigate, goToRecord, goToQueue };
};

const toLocation = (path: string): { pathname: string; search: string } => {
  const [pathname, search = ''] = path.split('?');
  return { pathname, search: search ? `?${search}` : '' };
};
