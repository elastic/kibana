/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

const UserWithoutProfileUidRt = rt.strict({
  email: rt.union([rt.undefined, rt.null, rt.string]),
  full_name: rt.union([rt.undefined, rt.null, rt.string]),
  username: rt.union([rt.undefined, rt.null, rt.string]),
});

export const UserRt = rt.intersection([
  UserWithoutProfileUidRt,
  rt.exact(rt.partial({ profile_uid: rt.string })),
]);

export const UserWithProfileInfoRt = rt.intersection([
  rt.strict({
    user: UserWithoutProfileUidRt,
  }),
  rt.exact(rt.partial({ uid: rt.string })),
  rt.exact(
    rt.partial({
      avatar: rt.exact(
        rt.partial({
          initials: rt.union([rt.string, rt.null]),
          color: rt.union([rt.string, rt.null]),
          imageUrl: rt.union([rt.string, rt.null]),
        })
      ),
    })
  ),
]);

export const UsersRt = rt.array(UserRt);

export type User = rt.TypeOf<typeof UserRt>;
export type UserWithProfileInfo = rt.TypeOf<typeof UserWithProfileInfoRt>;

export const CaseUserProfileRt = rt.strict({
  uid: rt.string,
});

export type CaseUserProfile = rt.TypeOf<typeof CaseUserProfileRt>;

/**
 * Assignees
 */
export const CaseAssigneesRt = rt.array(CaseUserProfileRt);
export type CaseAssignees = rt.TypeOf<typeof CaseAssigneesRt>;
