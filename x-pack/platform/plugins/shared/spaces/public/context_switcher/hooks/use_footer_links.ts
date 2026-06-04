/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import useMountedState from 'react-use/lib/useMountedState';

import { openWiredConnectionDetails } from '@kbn/cloud/connection_details';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import type { LinksListItem } from '@kbn/context-switcher-components';
import type { CoreStart } from '@kbn/core/public';
import { OBSERVABILITY_ONBOARDING_APP_ID } from '@kbn/deeplinks-observability';
import { SEARCH_GETTING_STARTED } from '@kbn/deeplinks-search';
import { SECURITY_APP_ID } from '@kbn/deeplinks-security';
import { HOME_APP_ID } from '@kbn/deeplinks-shared';
import type { WorkplaceAIApp } from '@kbn/deeplinks-workplace-ai';
import { i18n } from '@kbn/i18n';

import type { Space } from '../../../common';

type GetStartedAppId =
  | typeof HOME_APP_ID
  | typeof OBSERVABILITY_ONBOARDING_APP_ID
  | typeof SEARCH_GETTING_STARTED
  | typeof SECURITY_APP_ID
  | WorkplaceAIApp;

interface GetStartedTarget {
  appId: GetStartedAppId;
  path?: string;
}

const WORKPLACE_AI_APP_ID: WorkplaceAIApp = 'workplace_ai';

const SERVERLESS_TARGETS: Record<string, GetStartedTarget> = {
  observability: { appId: OBSERVABILITY_ONBOARDING_APP_ID },
  search: { appId: SEARCH_GETTING_STARTED },
  security: { appId: SECURITY_APP_ID, path: '/get_started' },
  workplaceai: { appId: WORKPLACE_AI_APP_ID },
};

const SPACE_SOLUTION_TARGETS: Record<string, GetStartedTarget> = {
  oblt: { appId: OBSERVABILITY_ONBOARDING_APP_ID },
  es: { appId: SEARCH_GETTING_STARTED },
  security: { appId: SECURITY_APP_ID, path: '/get_started' },
  workplaceai: { appId: WORKPLACE_AI_APP_ID },
  classic: { appId: HOME_APP_ID },
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

  const isMounted = useMountedState();

  useEffect(() => {
    if (!cloud || !isServerless) {
      setUsersAndRolesUrl(undefined);
      return;
    }
    cloud
      .getPrivilegedUrls()
      .then((urls) => {
        if (isMounted()) setUsersAndRolesUrl(urls.usersAndRolesUrl);
      })
      .catch(() => {
        if (isMounted()) setUsersAndRolesUrl(undefined);
      });
  }, [cloud, isServerless, isMounted]);

  return useMemo(() => {
    const items: LinksListItem[] = [];

    const serverlessProjectType = isServerless ? cloud?.serverless.projectType : undefined;

    const preferredTarget = (serverlessProjectType && SERVERLESS_TARGETS[serverlessProjectType]) ??
      (activeSpaceSolution && SPACE_SOLUTION_TARGETS[activeSpaceSolution]) ?? {
        appId: HOME_APP_ID,
      };

    const isObservability =
      serverlessProjectType === 'observability' || activeSpaceSolution === 'oblt';

    const getStartedHref = canAccessApp(preferredTarget.appId)
      ? application.getUrlForApp(preferredTarget.appId, { path: preferredTarget.path })
      : undefined;

    // TODO: https://github.com/elastic/kibana/issues/271876
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

    const canInviteUsersViaCloud = Boolean(isServerless && usersAndRolesUrl);
    const canInviteUsersViaKibana =
      !isServerless && canAccessApp('management') && Boolean(application.capabilities.users?.save);

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
