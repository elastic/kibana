/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import 'plugins/security/views/management/change_password_form/change_password_form';
import 'plugins/security/views/management/password_form/password_form';
import 'plugins/security/views/management/users_grid/users';
import 'plugins/security/views/management/roles_grid/roles';
import 'plugins/security/views/management/api_keys_grid/api_keys';
import 'plugins/security/views/management/edit_user/edit_user';
import 'plugins/security/views/management/edit_role/index';
import 'plugins/security/views/management/role_mappings/role_mappings_grid';
import 'plugins/security/views/management/role_mappings/edit_role_mapping';
import routes from 'ui/routes';
import { xpackInfo } from 'plugins/xpack_main/services/xpack_info';
import { ROLES_PATH, USERS_PATH, API_KEYS_PATH, ROLE_MAPPINGS_PATH } from './management_urls';

import { management } from 'ui/management';
import { npSetup } from 'ui/new_platform';
import { i18n } from '@kbn/i18n';
import { toastNotifications } from 'ui/notify';

routes
  .defaults(/^\/management\/security(\/|$)/, {
    resolve: {
      showLinks(kbnUrl, Promise) {
        if (!xpackInfo.get('features.security.showLinks')) {
          toastNotifications.addDanger({
            title: xpackInfo.get('features.security.linksMessage'),
          });
          kbnUrl.redirect('/management');
          return Promise.halt();
        }
      },
    },
  })
  .defaults(/\/management/, {
    resolve: {
      securityManagementSection: function() {
        const showSecurityLinks = xpackInfo.get('features.security.showLinks');
        const showRoleMappingsManagementLink = xpackInfo.get(
          'features.security.showRoleMappingsManagement'
        );

        function deregisterSecurity() {
          management.deregister('security');
        }

        function deregisterRoleMappingsManagement() {
          if (management.hasItem('security')) {
            const security = management.getSection('security');
            if (security.hasItem('roleMappings')) {
              security.deregister('roleMappings');
            }
          }
        }

        function ensureSecurityRegistered() {
          const registerSecurity = () =>
            management.register('security', {
              display: i18n.translate('xpack.security.management.securityTitle', {
                defaultMessage: 'Security',
              }),
              order: 100,
              icon: 'securityApp',
            });
          const getSecurity = () => management.getSection('security');

          const security = management.hasItem('security') ? getSecurity() : registerSecurity();

          if (!security.hasItem('users')) {
            security.register('users', {
              name: 'securityUsersLink',
              order: 10,
              display: i18n.translate('xpack.security.management.usersTitle', {
                defaultMessage: 'Users',
              }),
              url: `#${USERS_PATH}`,
            });
          }

          if (!security.hasItem('roles')) {
            security.register('roles', {
              name: 'securityRolesLink',
              order: 20,
              display: i18n.translate('xpack.security.management.rolesTitle', {
                defaultMessage: 'Roles',
              }),
              url: `#${ROLES_PATH}`,
            });
          }

          if (!security.hasItem('apiKeys')) {
            security.register('apiKeys', {
              name: 'securityApiKeysLink',
              order: 30,
              display: i18n.translate('xpack.security.management.apiKeysTitle', {
                defaultMessage: 'API Keys',
              }),
              url: `#${API_KEYS_PATH}`,
            });
          }

          if (showRoleMappingsManagementLink && !security.hasItem('roleMappings')) {
            security.register('roleMappings', {
              name: 'securityRoleMappingLink',
              order: 30,
              display: i18n.translate('xpack.security.management.roleMappingsTitle', {
                defaultMessage: 'Role Mappings',
              }),
              url: `#${ROLE_MAPPINGS_PATH}`,
            });
          }
        }

        if (!showSecurityLinks) {
          deregisterSecurity();
        } else {
          if (!showRoleMappingsManagementLink) {
            deregisterRoleMappingsManagement();
          }

          // getCurrentUser will reject if there is no authenticated user, so we prevent them from
          // seeing the security management screens.
          return npSetup.plugins.security.authc
            .getCurrentUser()
            .then(ensureSecurityRegistered)
            .catch(deregisterSecurity);
        }
      },
    },
  });
