/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_SUGGESTED_PROFILES } from '../../../constants';
import { GetCaseUsersResponseSchema, SuggestUserProfilesRequestSchema } from './v1';

describe('User', () => {
  describe('GetCaseUsersResponseSchema', () => {
    const defaultRequest = {
      assignees: [
        {
          user: {
            email: null,
            full_name: null,
            username: null,
          },
          uid: 'u_62h24XVQzG4-MuH1-DqPmookrJY23aRa9h4fyULR6I8_0',
        },
        {
          user: {
            email: null,
            full_name: null,
            username: 'elastic',
          },
          uid: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
        },
      ],
      unassignedUsers: [
        {
          user: {
            email: '',
            full_name: '',
            username: 'cases_no_connectors',
          },
          uid: 'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0',
        },
        {
          user: {
            email: 'valid_chimpanzee@profiles.elastic.co',
            full_name: 'Valid Chimpanzee',
            username: 'valid_chimpanzee',
          },
          uid: 'u_A_tM4n0wPkdiQ9smmd8o0Hr_h61XQfu8aRPh9GMoRoc_0',
        },
      ],
      participants: [
        {
          user: {
            email: 'participant_1@elastic.co',
            full_name: 'Participant 1',
            username: 'participant_1',
          },
        },
        {
          user: {
            email: 'participant_2@elastic.co',
            full_name: null,
            username: 'participant_2',
          },
        },
      ],
      reporter: {
        user: {
          email: 'reporter_no_uid@elastic.co',
          full_name: 'Reporter No UID',
          username: 'reporter_no_uid',
        },
      },
    };

    it('has expected attributes in request', () => {
      const result = GetCaseUsersResponseSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields', () => {
      const result = GetCaseUsersResponseSchema.safeParse({ ...defaultRequest, foo: 'bar' });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });
  });

  describe('UserProfile', () => {
    describe('SuggestUserProfilesRequestSchema', () => {
      const defaultRequest = {
        name: 'damaged_raccoon',
        owners: ['cases'],
        size: 5,
      };

      it('has expected attributes in request', () => {
        const result = SuggestUserProfilesRequestSchema.safeParse(defaultRequest);
        expect(result.success).toBe(true);
        expect(result.data).toStrictEqual(defaultRequest);
      });

      it('strips unknown fields', () => {
        const result = SuggestUserProfilesRequestSchema.safeParse({
          ...defaultRequest,
          foo: 'bar',
        });
        expect(result.success).toBe(true);
        expect(result.data).toStrictEqual(defaultRequest);
      });

      it(`does not accept size param bigger than ${MAX_SUGGESTED_PROFILES}`, () => {
        const result = SuggestUserProfilesRequestSchema.safeParse({
          ...defaultRequest,
          size: MAX_SUGGESTED_PROFILES + 1,
        });
        expect(result.success).toBe(false);
      });

      it('does not accept size param lower than 1', () => {
        const result = SuggestUserProfilesRequestSchema.safeParse({
          ...defaultRequest,
          size: 0,
        });
        expect(result.success).toBe(false);
      });
    });
  });
});
