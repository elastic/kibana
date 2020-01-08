/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
// @ts-ignore
import template from 'plugins/spaces/management/template.html';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
// @ts-ignore
import routes from 'ui/routes';
import { MANAGEMENT_BREADCRUMB } from 'ui/management/breadcrumbs';
import { npStart } from 'ui/new_platform';
import { Space } from '../../../../../plugins/spaces/public';
import { SpacesPluginStart } from '../../../../../plugins/spaces/public';

const spacesNPStart = (npStart.plugins as any).spaces as SpacesPluginStart;

const reactRootNodeId = 'manageSpacesReactRoot';

function getListBreadcrumbs() {
  return [
    MANAGEMENT_BREADCRUMB,
    {
      text: 'Spaces',
      href: '#/management/spaces/list',
    },
  ];
}

function getCreateBreadcrumbs() {
  return [
    ...getListBreadcrumbs(),
    {
      text: 'Create',
    },
  ];
}

function getEditBreadcrumbs(space?: Space) {
  return [
    ...getListBreadcrumbs(),
    {
      text: space ? space.name : '...',
    },
  ];
}

routes.when('/management/spaces/list', {
  template,
  k7Breadcrumbs: getListBreadcrumbs,
  requireUICapability: 'management.kibana.spaces',
  controller($scope: any) {
    $scope.$$postDigest(() => {
      const domNode = document.getElementById(reactRootNodeId);

      const { management } = spacesNPStart.__legacyCompat;

      render(<management.SpacesGridPage />, domNode);

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
    $scope.$$postDigest(() => {
      const domNode = document.getElementById(reactRootNodeId);

      const { management } = spacesNPStart.__legacyCompat;

      render(<management.ManageSpacePage />, domNode);

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

      const { management } = spacesNPStart.__legacyCompat;

      render(
        <management.ManageSpacePage
          spaceId={spaceId}
          onLoadSpace={space => {
            npStart.core.chrome.setBreadcrumbs(getEditBreadcrumbs(space));
          }}
        />,
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
