/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SnakeToCamelCase } from '../../../common/types';
import type { AccessUserAction } from '../../../common/types/domain';
import { CaseAccessMode } from '../../../common/types/domain';
import type { UserActionBuilder } from './types';
import { createCommonUpdateUserActionBuilder } from './common';
import { RESTRICTED_CASE, UNRESTRICTED_CASE } from './translations';

export const createAccessUserActionBuilder: UserActionBuilder = ({
  userAction,
  userProfiles,
  handleOutlineComment,
}) => ({
  build: () => {
    const accessUserAction = userAction as SnakeToCamelCase<AccessUserAction>;
    const isRestricted = accessUserAction.payload.access.mode === CaseAccessMode.RESTRICTED;

    const commonBuilder = createCommonUpdateUserActionBuilder({
      userAction,
      userProfiles,
      handleOutlineComment,
      label: isRestricted ? RESTRICTED_CASE : UNRESTRICTED_CASE,
      icon: isRestricted ? 'lock' : 'lockOpen',
    });

    return commonBuilder.build();
  },
});
