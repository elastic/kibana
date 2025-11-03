/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import type { InternalChromeStart } from '@kbn/core-chrome-browser-internal';
import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { toMountPoint } from '@kbn/react-kibana-mount';
import React from 'react';
import { generateManageOrgMembersNavCard, manageOrgMembersNavCardName } from './navigation';
import type {
  ServerlessPluginSetup,
  ServerlessPluginSetupDependencies,
  ServerlessPluginStart,
  ServerlessPluginStartDependencies,
} from './types';

export class ServerlessPlugin
  implements
    Plugin<
      ServerlessPluginSetup,
      ServerlessPluginStart,
      ServerlessPluginSetupDependencies,
      ServerlessPluginStartDependencies
    >
{
  constructor() {}

  public setup(
    _core: CoreSetup,
    _dependencies: ServerlessPluginSetupDependencies
  ): ServerlessPluginSetup {
    return {};
  }

  public start(
    core: CoreStart,
    dependencies: ServerlessPluginStartDependencies
  ): ServerlessPluginStart {
    const { chrome, rendering } = core;

    // Casting the "chrome.project" service to an "internal" type: this is intentional to obscure the property from Typescript.
    const { project } = chrome as InternalChromeStart;
    const { cloud } = dependencies;

    chrome.setChromeStyle('project');

    if (cloud.serverless.projectName) {
      project.setKibanaName(cloud.serverless.projectName);
    }

    project.setCloudUrls(cloud.getUrls()); // Ensure the project has the non-privileged URLs immediately
    cloud.getPrivilegedUrls().then((privilegedUrls) => {
      if (Object.keys(privilegedUrls).length === 0) return;

      project.setCloudUrls({ ...privilegedUrls, ...cloud.getUrls() }); // Merge the privileged URLs once available
    });

    chrome.navControls.registerRight({
      order: 1,
      mount: toMountPoint(
        <EuiButton
          href="https://ela.st/serverless-feedback"
          size={'s'}
          color={'warning'}
          iconType={'popout'}
          iconSide={'right'}
          target={'_blank'}
        >
          {i18n.translate('xpack.serverless.header.giveFeedbackBtn.label', {
            defaultMessage: 'Give feedback',
          })}
        </EuiButton>,
        rendering
      ),
    });

    return {
      initNavigation: (id, navigationTree$, config) => {
        project.initNavigation(id, navigationTree$, config);
      },
      setBreadcrumbs: (breadcrumbs, params) => project.setBreadcrumbs(breadcrumbs, params),
      setProjectHome: (homeHref: string) => project.setHome(homeHref),
      getNavigationCards: (roleManagementEnabled, extendCardNavDefinitions) => {
        if (!roleManagementEnabled) return extendCardNavDefinitions;

        const manageOrgMembersNavCard = generateManageOrgMembersNavCard(cloud.usersAndRolesUrl);
        if (extendCardNavDefinitions) {
          extendCardNavDefinitions[manageOrgMembersNavCardName] = manageOrgMembersNavCard;
          return extendCardNavDefinitions;
        }
        return { [manageOrgMembersNavCardName]: manageOrgMembersNavCard };
      },
    };
  }

  public stop() {}
}
