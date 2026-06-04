/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';

import type { CloudStart } from '@kbn/cloud-plugin/public';
import type {
  ContextSwitcherEnvironmentConfig,
  LinksListItem,
} from '@kbn/context-switcher-components';
import type { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';

const FALLBACK_ENVIRONMENT_NAME: Record<'project' | 'deployment', string> = {
  project: i18n.translate('xpack.spaces.contextSwitcher.environment.projectFallback', {
    defaultMessage: 'Project',
  }),
  deployment: i18n.translate('xpack.spaces.contextSwitcher.environment.deploymentFallback', {
    defaultMessage: 'Deployment',
  }),
};

export const useEnvironmentContext = ({
  cloud,
  http,
  isServerless,
}: {
  cloud?: CloudStart;
  http: CoreStart['http'];
  isServerless?: boolean;
}): ContextSwitcherEnvironmentConfig | undefined => {
  const isCloud = cloud?.isCloudEnabled ?? false;

  const [environmentName, setEnvironmentName] = useState<string>(() =>
    isServerless ? cloud?.serverless.projectName ?? '' : ''
  );

  useEffect(() => {
    if (!isCloud || isServerless) return;

    http
      .get<{ resourceData?: { deployment?: { name?: string } } }>('/internal/cloud/solution', {
        version: '1',
      })
      .then((response) => {
        const name = response?.resourceData?.deployment?.name;
        if (name) setEnvironmentName(name);
      })
      .catch(() => {});
  }, [http, isCloud, isServerless]);

  return useMemo((): ContextSwitcherEnvironmentConfig | undefined => {
    if (!cloud || (!isCloud && !isServerless)) return undefined;

    const environmentType = isServerless ? 'project' : 'deployment';
    const name = environmentName || FALLBACK_ENVIRONMENT_NAME[environmentType];
    const submenuItems: LinksListItem[] = [];

    if (cloud.deploymentUrl) {
      submenuItems.push({
        id: 'manage',
        label: isServerless
          ? i18n.translate('xpack.spaces.contextSwitcher.manageProject', {
              defaultMessage: 'Manage this project',
            })
          : i18n.translate('xpack.spaces.contextSwitcher.manageDeployment', {
              defaultMessage: 'Manage this deployment',
            }),
        href: cloud.deploymentUrl,
        iconType: 'gear',
      });
    }

    const allUrl = isServerless ? cloud.projectsUrl : cloud.deploymentsUrl;

    if (allUrl) {
      submenuItems.push({
        id: 'viewAll',
        label: isServerless
          ? i18n.translate('xpack.spaces.contextSwitcher.viewAllProjects', {
              defaultMessage: 'View all projects',
            })
          : i18n.translate('xpack.spaces.contextSwitcher.viewAllDeployments', {
              defaultMessage: 'View all deployments',
            }),
        href: allUrl,
        iconType: 'grid',
      });
    }

    return { environmentType, name, submenuItems };
  }, [cloud, environmentName, isCloud, isServerless]);
};
