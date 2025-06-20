/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useCallback } from 'react';
import type { ChromeBreadcrumb } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { ONECHAT_APP_ID } from '../../../common/features';
import { useKibana } from './use_kibana';

interface OnechatBreadcrumb {
  text: string;
  path?: string;
}

export const useBreadcrumb = (breadcrumbs: OnechatBreadcrumb[]) => {
  const {
    services: { chrome, application },
  } = useKibana();

  const getUrl = useCallback(
    (path: string) => {
      return application.getUrlForApp(ONECHAT_APP_ID, { path });
    },
    [application]
  );

  const appUrl = useMemo(() => {
    return getUrl('');
  }, [getUrl]);

  const baseCrumbs: ChromeBreadcrumb[] = useMemo(() => {
    return [
      {
        text: i18n.translate('xpack.onechat.breadcrumb.onechat', {
          defaultMessage: 'OneChat',
        }),
        href: appUrl,
      },
    ];
  }, [appUrl]);

  useEffect(() => {
    const additionalCrumbs = breadcrumbs.map<ChromeBreadcrumb>((crumb) => {
      return {
        text: crumb.text,
        href: crumb.path ? getUrl(crumb.path) : undefined,
      };
    });

    chrome.setBreadcrumbs([...baseCrumbs, ...additionalCrumbs], {
      project: { value: additionalCrumbs.length ? additionalCrumbs : baseCrumbs, absolute: true },
    });
    return () => {
      chrome.setBreadcrumbs([]);
    };
  }, [chrome, baseCrumbs, breadcrumbs, getUrl]);
};
