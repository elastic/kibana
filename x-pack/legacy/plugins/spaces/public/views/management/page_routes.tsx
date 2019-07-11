/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
// @ts-ignore
import template from 'plugins/spaces/views/management/template.html';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import 'ui/autoload/styles';
import { I18nContext } from 'ui/i18n';
// @ts-ignore
import routes from 'ui/routes';
import { npStart } from 'ui/new_platform';
import { getSpacesManager } from '../../lib/spaces_manager';
import { ManageSpacePage } from './edit_space';
import { getCreateBreadcrumbs, getEditBreadcrumbs, getListBreadcrumbs } from './lib';
import { SpacesGridPage } from './spaces_grid';

import { waitForSpacesNPInit } from '../../hacks/init_np_plugin';

const reactRootNodeId = 'manageSpacesReactRoot';

routes.when('/management/spaces/list', {
  template,
  k7Breadcrumbs: getListBreadcrumbs,
  requireUICapability: 'management.kibana.spaces',
  controller($scope: any) {
    $scope.$$postDigest(async () => {
      const domNode = document.getElementById(reactRootNodeId);

      await waitForSpacesNPInit;

      render(
        <I18nContext>
          <SpacesGridPage
            spacesManager={getSpacesManager()}
            capabilities={npStart.core.application.capabilities}
          />
        </I18nContext>,
        domNode
      );

      // unmount react on controller destroy
      $scope.$on('$destroy', () => {
        if (domNode) {
          unmountComponentAtNode(domNode);
        }
      });
    });
  },
});

routes.when('/management/spaces/create', {
  template,
  k7Breadcrumbs: getCreateBreadcrumbs,
  requireUICapability: 'management.kibana.spaces',
  controller($scope: any) {
    $scope.$$postDigest(async () => {
      const domNode = document.getElementById(reactRootNodeId);

      await waitForSpacesNPInit;

      render(
        <I18nContext>
          <ManageSpacePage
            spacesManager={getSpacesManager()}
            capabilities={npStart.core.application.capabilities}
          />
        </I18nContext>,
        domNode
      );

      // unmount react on controller destroy
      $scope.$on('$destroy', () => {
        if (domNode) {
          unmountComponentAtNode(domNode);
        }
      });
    });
  },
});

routes.when('/management/spaces/edit', {
  redirectTo: '/management/spaces/list',
});

routes.when('/management/spaces/edit/:spaceId', {
  template,
  k7Breadcrumbs: () => getEditBreadcrumbs(),
  requireUICapability: 'management.kibana.spaces',
  controller($scope: any, $route: any) {
    $scope.$$postDigest(async () => {
      const domNode = document.getElementById(reactRootNodeId);

      const { spaceId } = $route.current.params;

      await waitForSpacesNPInit;

      render(
        <I18nContext>
          <ManageSpacePage
            spaceId={spaceId}
            spacesManager={getSpacesManager()}
            setBreadcrumbs={npStart.core.chrome.setBreadcrumbs}
            capabilities={npStart.core.application.capabilities}
          />
        </I18nContext>,
        domNode
      );

      // unmount react on controller destroy
      $scope.$on('$destroy', () => {
        if (domNode) {
          unmountComponentAtNode(domNode);
        }
      });
    });
  },
});
