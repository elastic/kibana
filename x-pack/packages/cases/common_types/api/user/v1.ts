/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { limitedNumberSchema } from '@kbn/cases-common-schema';
import { MAX_SUGGESTED_PROFILES } from '@kbn/cases-common-constants';
import { UserWithProfileInfoRt } from '../../domain';

export const GetCaseUsersResponseRt = rt.strict({
  assignees: rt.array(UserWithProfileInfoRt),
  unassignedUsers: rt.array(UserWithProfileInfoRt),
  participants: rt.array(UserWithProfileInfoRt),
  reporter: UserWithProfileInfoRt,
});

export type GetCaseUsersResponse = rt.TypeOf<typeof GetCaseUsersResponseRt>;

/**
 * User Profiles
 */
export const SuggestUserProfilesRequestRt = rt.intersection([
  rt.strict({
    name: rt.string,
    owners: rt.array(rt.string),
  }),
  rt.exact(
    rt.partial({
      size: limitedNumberSchema({ fieldName: 'size', min: 1, max: MAX_SUGGESTED_PROFILES }),
    })
  ),
]);

export type SuggestUserProfilesRequest = rt.TypeOf<typeof SuggestUserProfilesRequestRt>;
