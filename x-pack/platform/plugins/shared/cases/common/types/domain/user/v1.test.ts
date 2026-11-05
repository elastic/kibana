/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { set } from '@kbn/safer-lodash-set';
import {
  UserSchema,
  UserWithProfileInfoSchema,
  UsersSchema,
  CaseUserProfileSchema,
  CaseAssigneesSchema,
} from './v1';

describe('User', () => {
  describe('UserSchema', () => {
    const defaultRequest = {
      full_name: 'elastic',
      email: 'testemail@elastic.co',
      username: 'elastic',
      profile_uid: 'profile-uid-1',
    };

    it('has expected attributes in request', () => {
      const result = UserSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields', () => {
      const result = UserSchema.safeParse({ ...defaultRequest, foo: 'bar' });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });
  });

  describe('UserWithProfileInfoSchema', () => {
    const defaultRequest = {
      uid: '1',
      avatar: {
        initials: 'SU',
        color: 'red',
        imageUrl: 'https://google.com/image1',
      },
      user: {
        username: 'user',
        email: 'some.user@google.com',
        full_name: 'Some Super User',
      },
    };

    it('has expected attributes in request', () => {
      const result = UserWithProfileInfoSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it.each(['initials', 'color', 'imageUrl'])('does not return an error if %s is null', (key) => {
      const req = set(
        { ...defaultRequest, avatar: { ...defaultRequest.avatar } },
        `avatar.${key}`,
        null
      );
      const result = UserWithProfileInfoSchema.safeParse(req);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(req);
    });

    it('strips unknown fields', () => {
      const result = UserWithProfileInfoSchema.safeParse({ ...defaultRequest, foo: 'bar' });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields from avatar', () => {
      const result = UserWithProfileInfoSchema.safeParse({
        ...defaultRequest,
        avatar: { ...defaultRequest.avatar, foo: 'bar' },
      });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });
  });

  describe('UsersSchema', () => {
    const defaultRequest = [
      {
        email: 'reporter_no_uid@elastic.co',
        full_name: 'Reporter No UID',
        username: 'reporter_no_uid',
        profile_uid: 'reporter-uid',
      },
      {
        full_name: 'elastic',
        email: 'testemail@elastic.co',
        username: 'elastic',
      },
    ];

    it('has expected attributes in request', () => {
      const result = UsersSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields', () => {
      const result = UsersSchema.safeParse([{ ...defaultRequest[0], foo: 'bar' }]);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual([defaultRequest[0]]);
    });
  });

  describe('UserProfile', () => {
    describe('CaseUserProfileSchema', () => {
      it('has expected attributes in response', () => {
        const result = CaseUserProfileSchema.safeParse({
          uid: 'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0',
        });
        expect(result.success).toBe(true);
        expect(result.data).toStrictEqual({
          uid: 'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0',
        });
      });

      it('strips unknown fields', () => {
        const result = CaseUserProfileSchema.safeParse({
          uid: 'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0',
          foo: 'bar',
        });
        expect(result.success).toBe(true);
        expect(result.data).toStrictEqual({
          uid: 'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0',
        });
      });
    });
  });

  describe('Assignee', () => {
    describe('CaseAssigneesSchema', () => {
      const defaultRequest = [{ uid: '1' }, { uid: '2' }];

      it('has expected attributes in request', () => {
        const result = CaseAssigneesSchema.safeParse(defaultRequest);
        expect(result.success).toBe(true);
        expect(result.data).toStrictEqual(defaultRequest);
      });

      it('strips unknown fields', () => {
        const result = CaseAssigneesSchema.safeParse([{ uid: '1', foo: 'bar' }, { uid: '2' }]);
        expect(result.success).toBe(true);
        expect(result.data).toStrictEqual([{ uid: '1' }, { uid: '2' }]);
      });
    });
  });
});
