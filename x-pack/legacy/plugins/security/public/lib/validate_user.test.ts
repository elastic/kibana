/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UserValidator, UserValidationResult } from './validate_user';
import { User, EditUser } from '../../common/model';

function expectValid(result: UserValidationResult) {
  expect(result.isInvalid).toBe(false);
}

function expectInvalid(result: UserValidationResult) {
  expect(result.isInvalid).toBe(true);
}

describe('UserValidator', () => {
  describe('#validateUsername', () => {
    it(`returns 'valid' if validation is disabled`, () => {
      expectValid(new UserValidator().validateUsername({} as User));
    });

    it(`returns 'invalid' if username is missing`, () => {
      expectInvalid(new UserValidator({ shouldValidate: true }).validateUsername({} as User));
    });

    it(`returns 'invalid' if username contains invalid characters`, () => {
      expectInvalid(
        new UserValidator({ shouldValidate: true }).validateUsername({
          username: '!@#$%^&*()',
        } as User)
      );
    });

    it(`returns 'valid' for correct usernames`, () => {
      expectValid(
        new UserValidator({ shouldValidate: true }).validateUsername({
          username: 'my_user',
        } as User)
      );
    });
  });

  describe('#validateEmail', () => {
    it(`returns 'valid' if validation is disabled`, () => {
      expectValid(new UserValidator().validateEmail({} as EditUser));
    });

    it(`returns 'valid' if email is missing`, () => {
      expectValid(new UserValidator({ shouldValidate: true }).validateEmail({} as EditUser));
    });

    it(`returns 'invalid' for invalid emails`, () => {
      expectInvalid(
        new UserValidator({ shouldValidate: true }).validateEmail({
          email: 'asf',
        } as EditUser)
      );
    });

    it(`returns 'valid' for correct emails`, () => {
      expectValid(
        new UserValidator({ shouldValidate: true }).validateEmail({
          email: 'foo@bar.co',
        } as EditUser)
      );
    });
  });

  describe('#validatePassword', () => {
    it(`returns 'valid' if validation is disabled`, () => {
      expectValid(new UserValidator().validatePassword({} as EditUser));
    });

    it(`returns 'invalid' if password is missing`, () => {
      expectInvalid(new UserValidator({ shouldValidate: true }).validatePassword({} as EditUser));
    });

    it(`returns 'invalid' for invalid password`, () => {
      expectInvalid(
        new UserValidator({ shouldValidate: true }).validatePassword({
          password: 'short',
        } as EditUser)
      );
    });

    it(`returns 'valid' for correct passwords`, () => {
      expectValid(
        new UserValidator({ shouldValidate: true }).validatePassword({
          password: 'changeme',
        } as EditUser)
      );
    });
  });

  describe('#validateConfirmPassword', () => {
    it(`returns 'valid' if validation is disabled`, () => {
      expectValid(new UserValidator().validateConfirmPassword({} as EditUser));
    });

    it(`returns 'invalid' if confirm password is missing`, () => {
      expectInvalid(
        new UserValidator({ shouldValidate: true }).validateConfirmPassword({
          password: 'changeme',
        } as EditUser)
      );
    });

    it(`returns 'invalid' for mismatched passwords`, () => {
      expectInvalid(
        new UserValidator({ shouldValidate: true }).validateConfirmPassword({
          password: 'changeme',
          confirmPassword: 'changeyou',
        } as EditUser)
      );
    });

    it(`returns 'valid' for correct passwords`, () => {
      expectValid(
        new UserValidator({ shouldValidate: true }).validateConfirmPassword({
          password: 'changeme',
          confirmPassword: 'changeme',
        } as EditUser)
      );
    });
  });
});
