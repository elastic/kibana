/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useCallback } from 'react';
import type { ChromeBreadcrumb } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { AGENTBUILDER_APP_ID } from '../../../common/features';
import { useKibana } from './use_kibana';
import { appPaths } from '../utils/app_paths';

interface AgentBuilderBreadcrumb {
  text: string;
  path?: string;
}

export const useBreadcrumb = (breadcrumbs: AgentBuilderBreadcrumb[]) => {
  const {
    services: { chrome, application },
  } = useKibana();

  const getUrl = useCallback(
    (path: string) => {
      return application.getUrlForApp(AGENTBUILDER_APP_ID, { path });
    },
    [application]
  );

  const appUrl = useMemo(() => {
    return getUrl('');
  }, [getUrl]);

  const baseCrumbs: ChromeBreadcrumb[] = useMemo(() => {
    return [
      {
        text: i18n.translate('xpack.agentBuilder.breadcrumb.agentBuilder', {
          defaultMessage: 'Agent Builder',
        }),
        href: appUrl,
      },
    ];
  }, [appUrl]);

  const additionalCrumbs = useMemo(() => {
    return breadcrumbs.map<ChromeBreadcrumb>((crumb) => {
      return {
        text: crumb.text,
        href: crumb.path ? getUrl(crumb.path) : undefined,
      };
    });
  }, [breadcrumbs, getUrl]);

  const chromeBreadcrumbs = useMemo(() => {
    const isRootBreadcrumb =
      breadcrumbs.length === 1 &&
      (breadcrumbs[0].path === appPaths.root || breadcrumbs[0].path === '');

    return isRootBreadcrumb ? additionalCrumbs : [...baseCrumbs, ...additionalCrumbs];
  }, [additionalCrumbs, baseCrumbs, breadcrumbs]);

  useEffect(() => {
    chrome.setBreadcrumbs(chromeBreadcrumbs, {
      project: { value: chromeBreadcrumbs, absolute: true },
    });
    return () => {
      chrome.setBreadcrumbs([]);
    };
  }, [chrome, chromeBreadcrumbs]);
};
