/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import { openWiredConnectionDetails } from '@kbn/cloud/connection_details';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import type { LinksListItem } from '@kbn/context-switcher-components';
import type { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';

import type { Space } from '../../../common';

interface GetStartedTarget {
  appId: string;
  path?: string;
}

const SERVERLESS_TARGETS: Record<string, GetStartedTarget> = {
  observability: { appId: 'observabilityOnboarding' },
  search: { appId: 'searchGettingStarted' },
  security: { appId: 'securitySolutionUI', path: '/get_started' },
  workplaceai: { appId: 'workplace_ai' },
};

const SPACE_SOLUTION_TARGETS: Record<string, GetStartedTarget> = {
  oblt: { appId: 'observabilityOnboarding' },
  es: { appId: 'searchGettingStarted' },
  security: { appId: 'securitySolutionUI', path: '/get_started' },
  workplaceai: { appId: 'workplace_ai' },
  classic: { appId: 'home' },
};

export const useFooterLinks = ({
  application,
  cloud,
  isServerless,
  activeSpaceSolution,
}: {
  application: CoreStart['application'];
  cloud?: CloudStart;
  isServerless?: boolean;
  activeSpaceSolution?: Space['solution'];
}): LinksListItem[] => {
  const [usersAndRolesUrl, setUsersAndRolesUrl] = useState<string | undefined>(undefined);

  const canAccessApp = useCallback(
    (appId: string): boolean => application.capabilities.navLinks?.[appId] === true,
    [application.capabilities.navLinks]
  );

  useEffect(() => {
    let isMounted = true;

    if (!cloud || isServerless !== true) {
      setUsersAndRolesUrl(undefined);
      return () => {
        isMounted = false;
      };
    }

    cloud
      .getPrivilegedUrls()
      .then((urls) => {
        if (isMounted) setUsersAndRolesUrl(urls.usersAndRolesUrl);
      })
      .catch(() => {
        if (isMounted) setUsersAndRolesUrl(undefined);
      });

    return () => {
      isMounted = false;
    };
  }, [cloud, isServerless]);

  return useMemo(() => {
    const items: LinksListItem[] = [];

    const serverlessProjectType = isServerless === true ? cloud?.serverless.projectType : undefined;

    const preferredTarget = (serverlessProjectType && SERVERLESS_TARGETS[serverlessProjectType]) ??
      (activeSpaceSolution && SPACE_SOLUTION_TARGETS[activeSpaceSolution]) ?? { appId: 'home' };

    const isObservability =
      serverlessProjectType === 'observability' || activeSpaceSolution === 'oblt';

    const getStartedHref = canAccessApp(preferredTarget.appId)
      ? application.getUrlForApp(preferredTarget.appId, { path: preferredTarget.path })
      : undefined;

    // "Get started" link ("Add data" for Observability projects)
    if (getStartedHref) {
      items.push({
        id: isObservability ? 'addData' : 'getStarted',
        label: isObservability
          ? i18n.translate('xpack.spaces.contextSwitcher.footerLinks.addDataLabel', {
              defaultMessage: 'Add data',
            })
          : i18n.translate('xpack.spaces.contextSwitcher.footerLinks.getStartedLabel', {
              defaultMessage: 'Get started',
            }),
        href: getStartedHref,
        iconType: isObservability ? 'plus' : 'rocket',
        'data-test-subj': `contextSwitcherFooterGetStarted-${preferredTarget.appId}`,
      });
    }

    // "Connection details" link
    if (isServerless === true && cloud?.isCloudEnabled === true) {
      items.push({
        id: 'connectionDetails',
        label: i18n.translate('xpack.spaces.contextSwitcher.footerLinks.connectionDetailsLabel', {
          defaultMessage: 'Connection details',
        }),
        onClick: () => {
          void openWiredConnectionDetails();
        },
        iconType: 'plugs',
        'data-test-subj': 'contextSwitcherFooterConnectionDetails',
      });
    }

    const canInviteUsersViaCloud = isServerless === true && Boolean(usersAndRolesUrl);
    const canInviteUsersViaKibana =
      isServerless !== true &&
      canAccessApp('management') &&
      application.capabilities.users?.save === true;

    const inviteUsersHref = canInviteUsersViaCloud
      ? usersAndRolesUrl
      : canInviteUsersViaKibana
      ? application.getUrlForApp('management', { path: 'security/users' })
      : undefined;

    // "Invite users" link
    if (inviteUsersHref) {
      items.push({
        id: 'inviteUsers',
        label: i18n.translate('xpack.spaces.contextSwitcher.footerLinks.inviteUsersLabel', {
          defaultMessage: 'Invite users',
        }),
        href: inviteUsersHref,
        iconType: 'user',
        external: canInviteUsersViaCloud,
        'data-test-subj': 'contextSwitcherFooterInviteUsers',
      });
    }

    return items;
  }, [application, canAccessApp, cloud, isServerless, usersAndRolesUrl, activeSpaceSolution]);
};
