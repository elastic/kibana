/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { SecurityPluginStart } from '@kbn/security-plugin/public';
import { getUserDisplayName } from '@kbn/user-profile-components';
import { bulkGetUserProfiles } from '../../../../../containers/user_profiles/api';
import { FIELD_REQUIRED, INVALID_USER_PROFILES } from '../../../translations';
import { toSelectedUsers } from './utils';

interface UseUserPickerValidatorsParams {
  isRequired: boolean;
  security: SecurityPluginStart;
}

type ValidateFn = (value: unknown) => true | string | Promise<true | string>;

export const useUserPickerValidators = ({
  isRequired,
  security,
}: UseUserPickerValidatorsParams): { validate: Record<string, ValidateFn> } =>
  useMemo(() => {
    const validate: Record<string, ValidateFn> = {};

    if (isRequired) {
      validate.required = (value) => (toSelectedUsers(value).length === 0 ? FIELD_REQUIRED : true);
    }

    validate.profilesValid = async (value) => {
      const users = toSelectedUsers(value);
      if (users.length === 0) return true;

      const profiles = await bulkGetUserProfiles({
        security,
        uids: users.map((u) => u.uid),
      });
      const profileMap = new Map(profiles.map((p) => [p.uid, p]));

      const invalid = users.filter((u) => {
        const profile = profileMap.get(u.uid);
        if (!profile) return true;
        return getUserDisplayName(profile.user) !== u.name;
      });

      if (invalid.length > 0) {
        return INVALID_USER_PROFILES(invalid.map((u) => u.name));
      }
      return true;
    };

    return { validate };
  }, [isRequired, security]);
