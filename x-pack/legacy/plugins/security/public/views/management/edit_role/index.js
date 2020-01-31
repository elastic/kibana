/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import routes from 'ui/routes';
import { capabilities } from 'ui/capabilities';
import { kfetch } from 'ui/kfetch';
import { fatalError, toastNotifications } from 'ui/notify';
import template from 'plugins/security/views/management/edit_role/edit_role.html';
import 'plugins/security/services/shield_user';
import 'plugins/security/services/shield_role';
import 'plugins/security/services/shield_indices';
import { start as data } from '../../../../../../../../src/legacy/core_plugins/data/public/legacy';
import { xpackInfo } from 'plugins/xpack_main/services/xpack_info';
import { SpacesManager } from '../../../../../spaces/public/lib';
import { ROLES_PATH, CLONE_ROLES_PATH, EDIT_ROLES_PATH } from '../management_urls';
import { getEditRoleBreadcrumbs, getCreateRoleBreadcrumbs } from '../breadcrumbs';

import { EditRolePage } from './components';

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { I18nContext } from 'ui/i18n';
import { i18n } from '@kbn/i18n';

const routeDefinition = action => ({
  template,
  k7Breadcrumbs: ($injector, $route) =>
    $injector.invoke(
      action === 'edit' && $route.current.params.name
        ? getEditRoleBreadcrumbs
        : getCreateRoleBreadcrumbs
    ),
  resolve: {
    role($route, ShieldRole, Promise, kbnUrl) {
      const name = $route.current.params.name;

      let role;

      if (name != null) {
        role = ShieldRole.get({ name }).$promise.catch(response => {
          if (response.status === 404) {
            toastNotifications.addDanger({
              title: i18n.translate('xpack.security.management.roles.roleNotFound', {
                defaultMessage: 'No "{roleName}" role found.',
                values: { roleName: name },
              }),
            });
            kbnUrl.redirect(ROLES_PATH);
          } else {
            return fatalError(response);
          }
        });
      } else {
        role = Promise.resolve(
          new ShieldRole({
            elasticsearch: {
              cluster: [],
              indices: [],
              run_as: [],
            },
            kibana: [],
            _unrecognized_applications: [],
          })
        );
      }

      return role.then(res => res.toJSON());
    },
    users(ShieldUser) {
      // $promise is used here because the result is an ngResource, not a promise itself
      return ShieldUser.query().$promise.then(users => _.map(users, 'username'));
    },
    indexPatterns() {
      const { indexPatterns } = data.indexPatterns;
      return indexPatterns.getTitles();
    },
    spaces(spacesEnabled) {
      if (spacesEnabled) {
        return new SpacesManager().getSpaces();
      }
      return [];
    },
    kibanaPrivileges() {
      return kfetch({
        method: 'get',
        pathname: '/api/security/privileges',
        query: { includeActions: true },
      });
    },
    builtinESPrivileges() {
      return kfetch({ method: 'get', pathname: '/api/security/v1/esPrivileges/builtin' });
    },
    features() {
      return kfetch({ method: 'get', pathname: '/api/features' }).catch(e => {
        // TODO: This check can be removed once all of these `resolve` entries are moved out of Angular and into the React app.
        const unauthorizedForFeatures = _.get(e, 'body.statusCode') === 404;
        if (unauthorizedForFeatures) {
          return [];
        }
        throw e;
      });
    },
  },
  controllerAs: 'editRole',
  controller($injector, $scope, $http, enableSpaceAwarePrivileges) {
    const $route = $injector.get('$route');
    const role = $route.current.locals.role;

    const allowDocumentLevelSecurity = xpackInfo.get(
      'features.security.allowRoleDocumentLevelSecurity'
    );
    const allowFieldLevelSecurity = xpackInfo.get('features.security.allowRoleFieldLevelSecurity');
    if (role.elasticsearch.indices.length === 0) {
      const emptyOption = {
        names: [],
        privileges: [],
      };

      if (allowFieldLevelSecurity) {
        emptyOption.field_security = {
          grant: ['*'],
          except: [],
        };
      }

      if (allowDocumentLevelSecurity) {
        emptyOption.query = '';
      }

      role.elasticsearch.indices.push(emptyOption);
    }

    const {
      users,
      indexPatterns,
      spaces,
      kibanaPrivileges,
      builtinESPrivileges,
      features,
    } = $route.current.locals;

    $scope.$$postDigest(async () => {
      const domNode = document.getElementById('editRoleReactRoot');

      render(
        <I18nContext>
          <EditRolePage
            action={action}
            runAsUsers={users}
            role={role}
            indexPatterns={indexPatterns}
            httpClient={$http}
            allowDocumentLevelSecurity={allowDocumentLevelSecurity}
            allowFieldLevelSecurity={allowFieldLevelSecurity}
            spaces={spaces}
            spacesEnabled={enableSpaceAwarePrivileges}
            uiCapabilities={capabilities.get()}
            features={features}
            kibanaPrivileges={kibanaPrivileges}
            builtinESPrivileges={builtinESPrivileges}
          />
        </I18nContext>,
        domNode
      );

      // unmount react on controller destroy
      $scope.$on('$destroy', () => {
        unmountComponentAtNode(domNode);
      });
    });
  },
});

routes.when(`${CLONE_ROLES_PATH}/:name`, routeDefinition('clone'));
routes.when(`${EDIT_ROLES_PATH}/:name?`, routeDefinition('edit'));
