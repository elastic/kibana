/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { securityMock } from '@kbn/security-plugin/public/mocks';
import type { SecurityPluginStart } from '@kbn/security-plugin/public';
import { GENERAL_CASES_OWNER } from '../../../common/constants';
import { createStartServicesMock } from '../../common/lib/kibana/kibana_react.mock';
import { bulkGetUserProfiles, getCurrentUserProfile, suggestUserProfiles } from './api';
import { userProfiles, userProfilesIds } from './api.mock';

describe('User profiles API', () => {
  describe('suggestUserProfiles', () => {
    const abortCtrl = new AbortController();
    const { http } = createStartServicesMock();

    beforeEach(() => {
      jest.clearAllMocks();
      http.post = jest.fn().mockResolvedValue(userProfiles);
    });

    it('returns the user profiles correctly', async () => {
      const res = await suggestUserProfiles({
        http,
        name: 'elastic',
        owners: [GENERAL_CASES_OWNER],
        signal: abortCtrl.signal,
      });

      expect(res).toEqual(userProfiles);
    });

    it('calls http.post correctly', async () => {
      await suggestUserProfiles({
        http,
        name: 'elastic',
        owners: [GENERAL_CASES_OWNER],
        signal: abortCtrl.signal,
      });

      expect(http.post).toHaveBeenCalledWith('/internal/cases/_suggest_user_profiles', {
        body: '{"name":"elastic","size":10,"owners":["cases"]}',
        signal: abortCtrl.signal,
      });
    });
  });

  describe('bulkGetUserProfiles', () => {
    let security: SecurityPluginStart;

    beforeEach(() => {
      jest.clearAllMocks();
      security = securityMock.createStart();
      security.userProfiles.bulkGet = jest.fn().mockResolvedValue(userProfiles);
    });

    it('returns the user profiles correctly', async () => {
      const res = await bulkGetUserProfiles({
        security,
        uids: userProfilesIds,
      });

      expect(res).toEqual(userProfiles);
    });

    it('should filter out empty user profiles', async () => {
      const res = await bulkGetUserProfiles({
        security,
        uids: [...userProfilesIds, ''],
      });

      expect(res).toEqual(userProfiles);
    });

    it('calls bulkGet correctly', async () => {
      await bulkGetUserProfiles({
        security,
        uids: userProfilesIds,
      });

      expect(security.userProfiles.bulkGet).toHaveBeenCalledWith({
        dataPath: 'avatar',
        uids: new Set([
          'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0',
          'u_A_tM4n0wPkdiQ9smmd8o0Hr_h61XQfu8aRPh9GMoRoc_0',
          'u_9xDEQqUqoYCnFnPPLq5mIRHKL8gBTo_NiKgOnd5gGk0_0',
        ]),
      });
    });
  });

  describe('getCurrentUserProfile', () => {
    let security: SecurityPluginStart;

    const currentProfile = userProfiles[0];

    beforeEach(() => {
      jest.clearAllMocks();
      security = securityMock.createStart();
      security.userProfiles.getCurrent = jest.fn().mockResolvedValue(currentProfile);
    });

    it('returns the current user profile correctly', async () => {
      const res = await getCurrentUserProfile({
        security,
      });

      expect(res).toEqual(currentProfile);
    });

    it('calls getCurrent correctly', async () => {
      await getCurrentUserProfile({
        security,
      });

      expect(security.userProfiles.getCurrent).toHaveBeenCalledWith({
        dataPath: 'avatar',
      });
    });
  });
});
