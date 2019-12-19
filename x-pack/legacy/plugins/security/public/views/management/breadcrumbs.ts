/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { MANAGEMENT_BREADCRUMB } from 'ui/management/breadcrumbs';

export function getUsersBreadcrumbs() {
  return [
    MANAGEMENT_BREADCRUMB,
    {
      text: i18n.translate('xpack.security.users.breadcrumb', {
        defaultMessage: 'Users',
      }),
      href: '#/management/security/users',
    },
  ];
}

export function getEditUserBreadcrumbs($route: Record<string, any>) {
  const { username } = $route.current.params;
  return [
    ...getUsersBreadcrumbs(),
    {
      text: username,
      href: `#/management/security/users/edit/${username}`,
    },
  ];
}

export function getCreateUserBreadcrumbs() {
  return [
    ...getUsersBreadcrumbs(),
    {
      text: i18n.translate('xpack.security.users.createBreadcrumb', {
        defaultMessage: 'Create',
      }),
    },
  ];
}

export function getRolesBreadcrumbs() {
  return [
    MANAGEMENT_BREADCRUMB,
    {
      text: i18n.translate('xpack.security.roles.breadcrumb', {
        defaultMessage: 'Roles',
      }),
      href: '#/management/security/roles',
    },
  ];
}

export function getEditRoleBreadcrumbs($route: Record<string, any>) {
  const { name } = $route.current.params;
  return [
    ...getRolesBreadcrumbs(),
    {
      text: name,
      href: `#/management/security/roles/edit/${name}`,
    },
  ];
}

export function getCreateRoleBreadcrumbs() {
  return [
    ...getUsersBreadcrumbs(),
    {
      text: i18n.translate('xpack.security.roles.createBreadcrumb', {
        defaultMessage: 'Create',
      }),
    },
  ];
}

export function getApiKeysBreadcrumbs() {
  return [
    MANAGEMENT_BREADCRUMB,
    {
      text: i18n.translate('xpack.security.apiKeys.breadcrumb', {
        defaultMessage: 'API Keys',
      }),
      href: '#/management/security/api_keys',
    },
  ];
}

export function getRoleMappingBreadcrumbs() {
  return [
    MANAGEMENT_BREADCRUMB,
    {
      text: i18n.translate('xpack.security.roleMapping.breadcrumb', {
        defaultMessage: 'Role Mappings',
      }),
      href: '#/management/security/role_mappings',
    },
  ];
}

export function getEditRoleMappingBreadcrumbs($route: Record<string, any>) {
  const { name } = $route.current.params;
  return [
    ...getRoleMappingBreadcrumbs(),
    {
      text:
        name ||
        i18n.translate('xpack.security.roleMappings.createBreadcrumb', {
          defaultMessage: 'Create',
        }),
      href: `#/management/security/role_mappings/edit/${name}`,
    },
  ];
}
