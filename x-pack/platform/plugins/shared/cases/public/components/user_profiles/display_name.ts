/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserProfileUserInfo } from '@kbn/user-profile-components';
import { getUserDisplayName } from '@kbn/user-profile-components';
import { isEmpty } from 'lodash';
import * as i18n from './translations';

export const getName = (user?: UserProfileUserInfo): string => {
  if (!user) {
    return i18n.UNKNOWN;
  }

  const displayName = getUserDisplayName(user);
  return !isEmpty(displayName) ? displayName : i18n.UNKNOWN;
};
