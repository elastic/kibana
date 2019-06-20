/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { Role, RoleIndexPrivilege } from '../../../../../common/model';

interface RoleValidatorOptions {
  shouldValidate?: boolean;
}

export interface RoleValidationResult {
  isInvalid: boolean;
  error?: string;
}

export class RoleValidator {
  private shouldValidate?: boolean;

  constructor(options: RoleValidatorOptions = {}) {
    this.shouldValidate = options.shouldValidate;
  }

  public enableValidation() {
    this.shouldValidate = true;
  }

  public disableValidation() {
    this.shouldValidate = false;
  }

  public validateRoleName(role: Role): RoleValidationResult {
    if (!this.shouldValidate) {
      return valid();
    }

    if (!role.name) {
      return invalid(
        i18n.translate(
          'xpack.security.management.editRole.validateRole.provideRoleNameWarningMessage',
          {
            defaultMessage: 'Please provide a role name',
          }
        )
      );
    }
    if (role.name.length > 1024) {
      return invalid(
        i18n.translate('xpack.security.management.editRole.validateRole.nameLengthWarningMessage', {
          defaultMessage: 'Name must not exceed 1024 characters',
        })
      );
    }
    if (!role.name.match(/^[a-zA-Z_][a-zA-Z0-9_@\-\$\.]*$/)) {
      return invalid(
        i18n.translate(
          'xpack.security.management.editRole.validateRole.nameAllowedCharactersWarningMessage',
          {
            defaultMessage:
              'Name must begin with a letter or underscore and contain only letters, underscores, and numbers.',
          }
        )
      );
    }
    return valid();
  }

  public validateIndexPrivileges(role: Role): RoleValidationResult {
    if (!this.shouldValidate) {
      return valid();
    }

    if (!Array.isArray(role.elasticsearch.indices)) {
      throw new TypeError(
        i18n.translate('xpack.security.management.editRole.validateRole.indicesTypeErrorMessage', {
          defaultMessage: 'Expected {elasticIndices} to be an array',
          values: {
            elasticIndices: '"role.elasticsearch.indices"',
          },
        })
      );
    }

    const areIndicesValid =
      role.elasticsearch.indices
        .map(indexPriv => this.validateIndexPrivilege(indexPriv))
        .find((result: RoleValidationResult) => result.isInvalid) == null;

    if (areIndicesValid) {
      return valid();
    }
    return invalid();
  }

  public validateIndexPrivilege(indexPrivilege: RoleIndexPrivilege): RoleValidationResult {
    if (!this.shouldValidate) {
      return valid();
    }

    if (indexPrivilege.names.length && !indexPrivilege.privileges.length) {
      return invalid(
        i18n.translate(
          'xpack.security.management.editRole.validateRole.onePrivilegeRequiredWarningMessage',
          {
            defaultMessage: 'At least one privilege is required',
          }
        )
      );
    }
    return valid();
  }

  public validateSelectedSpaces(
    spaceIds: string[],
    privilege: string | null
  ): RoleValidationResult {
    if (!this.shouldValidate) {
      return valid();
    }

    // If no assigned privilege, then no spaces are OK
    if (!privilege) {
      return valid();
    }

    if (Array.isArray(spaceIds) && spaceIds.length > 0) {
      return valid();
    }
    return invalid(
      i18n.translate(
        'xpack.security.management.editRole.validateRole.oneSpaceRequiredWarningMessage',
        {
          defaultMessage: 'At least one space is required',
        }
      )
    );
  }

  public validateSelectedPrivilege(
    spaceIds: string[],
    privilege: string | null
  ): RoleValidationResult {
    if (!this.shouldValidate) {
      return valid();
    }

    // If no assigned spaces, then a missing privilege is OK
    if (!spaceIds || spaceIds.length === 0) {
      return valid();
    }

    if (privilege) {
      return valid();
    }
    return invalid(
      i18n.translate(
        'xpack.security.management.editRole.validateRole.privilegeRequiredWarningMessage',
        {
          defaultMessage: 'Privilege is required',
        }
      )
    );
  }

  public validateSpacePrivileges(role: Role): RoleValidationResult {
    if (!this.shouldValidate) {
      return valid();
    }

    const privileges = role.kibana || [];

    const arePrivilegesValid = privileges.every(assignedPrivilege => {
      return assignedPrivilege.base.length > 0 || Object.keys(assignedPrivilege.feature).length > 0;
    });

    if (arePrivilegesValid) {
      return valid();
    }
    return invalid();
  }

  public validateForSave(role: Role): RoleValidationResult {
    const { isInvalid: isNameInvalid } = this.validateRoleName(role);
    const { isInvalid: areIndicesInvalid } = this.validateIndexPrivileges(role);
    const { isInvalid: areSpacePrivilegesInvalid } = this.validateSpacePrivileges(role);

    if (isNameInvalid || areIndicesInvalid || areSpacePrivilegesInvalid) {
      return invalid();
    }

    return valid();
  }
}

function invalid(error?: string): RoleValidationResult {
  return {
    isInvalid: true,
    error,
  };
}

function valid(): RoleValidationResult {
  return {
    isInvalid: false,
  };
}
