/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import { InternalChromeStart } from '@kbn/core-chrome-browser-internal';
import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { toMountPoint } from '@kbn/react-kibana-mount';
import React from 'react';
import {
  generateManageOrgMembersNavCard,
  manageOrgMembersNavCardName,
  SideNavComponent,
} from './navigation';
import {
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
      project.setProjectName(cloud.serverless.projectName);
    }
    project.setCloudUrls(cloud);

    const activeNavigationNodes$ = project.getActiveNavigationNodes$();
    const navigationTreeUi$ = project.getNavigationTreeUi$();

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
      setSideNavComponentDeprecated: (sideNavigationComponent) =>
        project.setSideNavComponent(sideNavigationComponent),
      initNavigation: (id, navigationTree$, { dataTestSubj } = {}) => {
        project.initNavigation(id, navigationTree$);
        project.setSideNavComponent(() => (
          <SideNavComponent
            navProps={{ navigationTree$: navigationTreeUi$, dataTestSubj }}
            deps={{ core, activeNodes$: activeNavigationNodes$ }}
          />
        ));
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
