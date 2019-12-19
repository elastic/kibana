/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
// @ts-ignore
import template from 'plugins/spaces/management/template.html';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { I18nContext } from 'ui/i18n';
// @ts-ignore
import routes from 'ui/routes';
import { npStart } from 'ui/new_platform';
import { ManageSpacePage } from './edit_space';
import { getCreateBreadcrumbs, getEditBreadcrumbs, getListBreadcrumbs } from './lib';
import { SpacesGridPage } from './spaces_grid';

import { start as spacesNPStart } from '../legacy';

const reactRootNodeId = 'manageSpacesReactRoot';

routes.when('/management/spaces/list', {
  template,
  k7Breadcrumbs: getListBreadcrumbs,
  requireUICapability: 'management.kibana.spaces',
  controller($scope: any) {
    $scope.$$postDigest(async () => {
      const domNode = document.getElementById(reactRootNodeId);

      const { spacesManager } = await spacesNPStart;

      render(
        <I18nContext>
          <SpacesGridPage
            spacesManager={spacesManager!}
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

      const { spacesManager } = await spacesNPStart;

      render(
        <I18nContext>
          <ManageSpacePage
            spacesManager={spacesManager!}
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

      const { spacesManager } = await spacesNPStart;

      render(
        <I18nContext>
          <ManageSpacePage
            spaceId={spaceId}
            spacesManager={spacesManager!}
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
