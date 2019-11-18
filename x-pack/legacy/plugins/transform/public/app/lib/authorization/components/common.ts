/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export interface Capabilities {
  canGetTransform: boolean;
  canDeleteTransform: boolean;
  canPreviewTransform: boolean;
  canCreateTransform: boolean;
  canStartStopTransform: boolean;
}

export type Privilege = [string, string];

export interface Privileges {
  hasAllPrivileges: boolean;
  missingPrivileges: MissingPrivileges;
}

export interface MissingPrivileges {
  [key: string]: string[] | undefined;
}
export const toArray = (value: string | string[]): string[] =>
  Array.isArray(value) ? value : [value];

export const hasPrivilegeFactory = (privileges: Privileges) => (privilege: Privilege) => {
  const [section, requiredPrivilege] = privilege;
  if (!privileges.missingPrivileges[section]) {
    // if the section does not exist in our missingPrivileges, everything is OK
    return true;
  }
  if (privileges.missingPrivileges[section]!.length === 0) {
    return true;
  }
  if (requiredPrivilege === '*') {
    // If length > 0 and we require them all... KO
    return false;
  }
  // If we require _some_ privilege, we make sure that the one
  // we require is *not* in the missingPrivilege array
  return !privileges.missingPrivileges[section]!.includes(requiredPrivilege);
};

// create the text for button's tooltips if the user
// doesn't have the permission to press that button
export function createCapabilityFailureMessage(capability: keyof Capabilities) {
  let message = '';

  switch (capability) {
    case 'canCreateTransform':
      message = i18n.translate('xpack.transform.capability.noPermission.createTransformTooltip', {
        defaultMessage: 'You do not have permission to create transforms.',
      });
      break;
    case 'canStartStopTransform':
      message = i18n.translate(
        'xpack.transform.capability.noPermission.startOrStopTransformTooltip',
        {
          defaultMessage: 'You do not have permission to start or stop transforms.',
        }
      );
      break;
    case 'canDeleteTransform':
      message = i18n.translate('xpack.transform.capability.noPermission.deleteTransformTooltip', {
        defaultMessage: 'You do not have permission to delete transforms.',
      });
      break;
  }

  return i18n.translate('xpack.transform.capability.pleaseContactAdministratorTooltip', {
    defaultMessage: '{message} Please contact your administrator.',
    values: {
      message,
    },
  });
}
