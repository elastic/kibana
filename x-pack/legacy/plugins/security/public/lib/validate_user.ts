/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { User, EditUser } from '../../common/model';

interface UserValidatorOptions {
  shouldValidate?: boolean;
}

export interface UserValidationResult {
  isInvalid: boolean;
  error?: string;
}

const validEmailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
const validUsernameRegex = /[a-zA-Z_][a-zA-Z0-9_@\-\$\.]*/;

export class UserValidator {
  private shouldValidate?: boolean;

  constructor(options: UserValidatorOptions = {}) {
    this.shouldValidate = options.shouldValidate;
  }

  public enableValidation() {
    this.shouldValidate = true;
  }

  public disableValidation() {
    this.shouldValidate = false;
  }

  public validateUsername(user: User): UserValidationResult {
    if (!this.shouldValidate) {
      return valid();
    }

    const { username } = user;
    if (!username) {
      return invalid(
        i18n.translate('xpack.security.management.users.editUser.requiredUsernameErrorMessage', {
          defaultMessage: 'Username is required',
        })
      );
    } else if (username && !username.match(validUsernameRegex)) {
      return invalid(
        i18n.translate(
          'xpack.security.management.users.editUser.usernameAllowedCharactersErrorMessage',
          {
            defaultMessage:
              'Username must begin with a letter or underscore and contain only letters, underscores, and numbers',
          }
        )
      );
    }

    return valid();
  }

  public validateEmail(user: EditUser): UserValidationResult {
    if (!this.shouldValidate) {
      return valid();
    }

    const { email } = user;
    if (email && !email.match(validEmailRegex)) {
      return invalid(
        i18n.translate('xpack.security.management.users.editUser.validEmailRequiredErrorMessage', {
          defaultMessage: 'Email address is invalid',
        })
      );
    }
    return valid();
  }

  public validatePassword(user: EditUser): UserValidationResult {
    if (!this.shouldValidate) {
      return valid();
    }

    const { password } = user;
    if (!password || password.length < 6) {
      return invalid(
        i18n.translate('xpack.security.management.users.editUser.passwordLengthErrorMessage', {
          defaultMessage: 'Password must be at least 6 characters',
        })
      );
    }
    return valid();
  }

  public validateConfirmPassword(user: EditUser): UserValidationResult {
    if (!this.shouldValidate) {
      return valid();
    }

    const { password, confirmPassword } = user;
    if (password && confirmPassword !== null && password !== confirmPassword) {
      return invalid(
        i18n.translate('xpack.security.management.users.editUser.passwordDoNotMatchErrorMessage', {
          defaultMessage: 'Passwords do not match',
        })
      );
    }
    return valid();
  }

  public validateForSave(user: EditUser, isNewUser: boolean): UserValidationResult {
    const { isInvalid: isUsernameInvalid } = this.validateUsername(user);
    const { isInvalid: isEmailInvalid } = this.validateEmail(user);
    let isPasswordInvalid = false;
    let isConfirmPasswordInvalid = false;

    if (isNewUser) {
      isPasswordInvalid = this.validatePassword(user).isInvalid;
      isConfirmPasswordInvalid = this.validateConfirmPassword(user).isInvalid;
    }

    if (isUsernameInvalid || isEmailInvalid || isPasswordInvalid || isConfirmPasswordInvalid) {
      return invalid();
    }

    return valid();
  }
}

function invalid(error?: string): UserValidationResult {
  return {
    isInvalid: true,
    error,
  };
}

function valid(): UserValidationResult {
  return {
    isInvalid: false,
  };
}
