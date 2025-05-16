/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuildFlavor } from '@kbn/config';
import { i18n } from '@kbn/i18n';

import type {
  Role,
  RoleIndexPrivilege,
  RoleRemoteClusterPrivilege,
  RoleRemoteIndexPrivilege,
} from '../../../../common';
import { MAX_NAME_LENGTH, NAME_REGEX, SERVERLESS_NAME_REGEX } from '../../../../common/constants';

interface RoleValidatorOptions {
  shouldValidate?: boolean;
  buildFlavor?: BuildFlavor;
}

export interface RoleValidationResult {
  isInvalid: boolean;
  error?: string;
}

export class RoleValidator {
  private shouldValidate?: boolean;
  private buildFlavor?: BuildFlavor;

  constructor(options: RoleValidatorOptions = {}) {
    this.shouldValidate = options.shouldValidate;
    this.buildFlavor = options.buildFlavor;
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
            defaultMessage: 'Please provide a role name.',
          }
        )
      );
    }
    if (role.name.length > MAX_NAME_LENGTH) {
      return invalid(
        i18n.translate('xpack.security.management.editRole.validateRole.nameLengthWarningMessage', {
          defaultMessage: 'Name must not exceed {maxLength} characters.',
          values: { maxLength: MAX_NAME_LENGTH },
        })
      );
    }
    if (role.name.trim() !== role.name) {
      return invalid(
        i18n.translate(
          'xpack.security.management.editRole.validateRole.nameWhitespaceWarningMessage',
          {
            defaultMessage: `Name must not contain leading or trailing spaces.`,
          }
        )
      );
    }
    if (this.buildFlavor === 'serverless' && !role.name.match(SERVERLESS_NAME_REGEX)) {
      return invalid(
        i18n.translate(
          'xpack.security.management.editRole.validateRole.serverlessNameAllowedCharactersWarningMessage',
          {
            defaultMessage:
              'Name must contain only alphanumeric characters, and non-leading dots, hyphens, or underscores.',
          }
        )
      );
    } else if (this.buildFlavor !== 'serverless' && !role.name.match(NAME_REGEX)) {
      return invalid(
        i18n.translate(
          'xpack.security.management.editRole.validateRole.nameAllowedCharactersWarningMessage',
          {
            defaultMessage:
              'Name must contain only letters, numbers, spaces, punctuation and printable symbols.',
          }
        )
      );
    }

    return valid();
  }
  public validateRemoteClusterPrivileges(role: Role): RoleValidationResult {
    if (!this.shouldValidate) {
      return valid();
    }

    const areRemoteClustersInvalid = role.elasticsearch.remote_cluster?.some(
      (remoteClusterPrivilege) => {
        return (
          this.validateRemoteClusterPrivilegeClusterField(remoteClusterPrivilege).isInvalid ||
          this.validateRemoteClusterPrivilegePrivilegesField(remoteClusterPrivilege).isInvalid
        );
      }
    );

    if (areRemoteClustersInvalid) {
      return invalid();
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

    const areIndicesInvalid = role.elasticsearch.indices.reduce((isInvalid, indexPriv) => {
      if (
        this.validateIndexPrivilegeNamesField(indexPriv).isInvalid ||
        this.validateIndexPrivilegePrivilegesField(indexPriv).isInvalid
      ) {
        return true;
      }
      return isInvalid;
    }, false);

    if (areIndicesInvalid) {
      return invalid();
    }

    return valid();
  }

  public validateRemoteIndexPrivileges(role: Role): RoleValidationResult {
    if (!this.shouldValidate) {
      return valid();
    }

    if (!role.elasticsearch.remote_indices) {
      return valid();
    }

    if (!Array.isArray(role.elasticsearch.remote_indices)) {
      throw new TypeError(
        i18n.translate('xpack.security.management.editRole.validateRole.indicesTypeErrorMessage', {
          defaultMessage: 'Expected {elasticIndices} to be an array',
          values: {
            elasticIndices: '"role.elasticsearch.remote_indices"',
          },
        })
      );
    }

    const areRemoteIndicesInvalid = role.elasticsearch.remote_indices.reduce(
      (isInvalid, indexPriv) => {
        if (
          this.validateRemoteIndexPrivilegeClustersField(indexPriv).isInvalid ||
          this.validateIndexPrivilegeNamesField(indexPriv).isInvalid ||
          this.validateIndexPrivilegePrivilegesField(indexPriv).isInvalid
        ) {
          return true;
        }
        return isInvalid;
      },
      false
    );

    if (areRemoteIndicesInvalid) {
      return invalid();
    }

    return valid();
  }

  public validateRemoteIndexPrivilegeClustersField(
    indexPrivilege: RoleRemoteIndexPrivilege
  ): RoleValidationResult {
    if (!this.shouldValidate) {
      return valid();
    }

    // Ignore if all other fields are empty
    if (!indexPrivilege.names.length && !indexPrivilege.privileges.length) {
      return valid();
    }

    if (!indexPrivilege.clusters || !indexPrivilege.clusters.length) {
      return invalid(
        i18n.translate(
          'xpack.security.management.editRole.validateRole.oneRemoteClusterRequiredWarningMessage',
          {
            defaultMessage: 'Enter or select at least one remote cluster',
          }
        )
      );
    }

    return valid();
  }

  public validateIndexPrivilegeNamesField(
    indexPrivilege: RoleIndexPrivilege | RoleRemoteIndexPrivilege
  ): RoleValidationResult {
    if (!this.shouldValidate) {
      return valid();
    }

    // Ignore if all other fields are empty
    if (
      (!('clusters' in indexPrivilege) || !indexPrivilege.clusters.length) &&
      !indexPrivilege.privileges.length
    ) {
      return valid();
    }

    if (!indexPrivilege.names.length) {
      return invalid(
        i18n.translate(
          'xpack.security.management.editRole.validateRole.oneIndexRequiredWarningMessage',
          {
            defaultMessage: 'Enter or select at least one index pattern',
          }
        )
      );
    }

    return valid();
  }

  public validateIndexPrivilegePrivilegesField(
    indexPrivilege: RoleIndexPrivilege | RoleRemoteIndexPrivilege
  ): RoleValidationResult {
    if (!this.shouldValidate) {
      return valid();
    }

    // Ignore if all other fields are empty
    if (
      (!('clusters' in indexPrivilege) || !indexPrivilege.clusters.length) &&
      !indexPrivilege.names.length
    ) {
      return valid();
    }

    if (!indexPrivilege.privileges.length) {
      return invalid(
        i18n.translate(
          'xpack.security.management.editRole.validateRole.onePrivilegeRequiredWarningMessage',
          {
            defaultMessage: 'Enter or select at least one action',
          }
        )
      );
    }

    return valid();
  }

  public validateRemoteClusterPrivilegeClusterField(
    remoteClusterPrivilege: RoleRemoteClusterPrivilege
  ): RoleValidationResult {
    if (!this.shouldValidate) {
      return valid();
    }

    // Ignore if all other fields are empty
    if (!remoteClusterPrivilege.privileges.length) {
      return valid();
    }

    if (!remoteClusterPrivilege.clusters.length) {
      return invalid(
        i18n.translate(
          'xpack.security.management.editRole.validateRole.oneClusterRequiredWarningMessage',
          {
            defaultMessage: 'Enter or select at least one cluster',
          }
        )
      );
    }

    return valid();
  }

  public validateRemoteClusterPrivilegePrivilegesField(
    remoteClusterPrivilege: RoleRemoteClusterPrivilege
  ): RoleValidationResult {
    if (!this.shouldValidate) {
      return valid();
    }

    // Ignore if all other fields are empty
    if (!remoteClusterPrivilege.clusters.length) {
      return valid();
    }

    if (!remoteClusterPrivilege.privileges.length) {
      return invalid(
        i18n.translate(
          'xpack.security.management.editRole.validateRole.oneRemoteClusterPrivilegeRequiredWarningMessage',
          {
            defaultMessage: 'Enter or select at least one privilege',
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

    const arePrivilegesValid = privileges.every((assignedPrivilege) => {
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
    const { isInvalid: areRemoteIndicesInvalid } = this.validateRemoteIndexPrivileges(role);
    const { isInvalid: areSpacePrivilegesInvalid } = this.validateSpacePrivileges(role);
    const { isInvalid: areRemoteClusterPrivilegesInvalid } =
      this.validateRemoteClusterPrivileges(role);

    if (
      isNameInvalid ||
      areIndicesInvalid ||
      areRemoteIndicesInvalid ||
      areSpacePrivilegesInvalid ||
      areRemoteClusterPrivilegesInvalid
    ) {
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
