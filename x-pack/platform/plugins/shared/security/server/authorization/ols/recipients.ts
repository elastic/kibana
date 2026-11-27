/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserProfileServiceStart } from '@kbn/core-user-profile-server';
import { AclChangeError, type Principal } from '@kbn/ols';

/**
 * How {@link validateRecipients} finds out whether principals exist.
 */
export interface RecipientLookups {
  /** Reads user profiles. A user exists when the profile exists and is enabled. */
  userProfiles: Pick<UserProfileServiceStart, 'bulkGet'>;
  /** Resolves whether a service account exists, disabled ones included. */
  serviceAccountExists: (id: string) => Promise<boolean>;
}

const getRecipientKey = ({ type, id }: Principal) => `${type}:${id}`;

/**
 * Checks that new or increased grants, and a new owner, name principals that exist. Unchanged or
 * reduced grants are never checked, so a deleted recipient cannot block unrelated changes.
 *
 * @param recipients Whether each principal exists, from earlier calls in the request. Lookups are
 *   stored before they complete, so calls that run at once share them.
 * @param lookups How users and service accounts are looked up.
 * @param principals The principals to check.
 * @throws {AclChangeError} `bad_request` for the first principal, in input order, that doesn't
 *   exist.
 */
export const validateRecipients = async (
  recipients: Map<string, Promise<boolean>>,
  { userProfiles, serviceAccountExists }: RecipientLookups,
  principals: Principal[]
) => {
  // A principal that an earlier call in this request checked, or is still checking, is not looked
  // up again.
  const unchecked = principals.filter((principal) => !recipients.has(getRecipientKey(principal)));

  // All new users are looked up in one request. Each user's answer is stored before the request
  // completes, so that calls running at the same time share it. A disabled profile counts as missing.
  const userIds = [...new Set(unchecked.filter(({ type }) => type === 'user').map(({ id }) => id))];
  if (userIds.length > 0) {
    const enabledIds = userProfiles
      .bulkGet({ uids: new Set(userIds) })
      .then((profiles) => new Set(profiles.filter(({ enabled }) => enabled).map(({ uid }) => uid)));
    for (const id of userIds) {
      recipients.set(
        getRecipientKey({ type: 'user', id }),
        enabledIds.then((ids) => ids.has(id))
      );
    }
  }

  // Service accounts have no bulk lookup, so each new one is looked up on its own, once.
  for (const principal of unchecked) {
    const principalKey = getRecipientKey(principal);
    if (principal.type === 'service_account' && !recipients.has(principalKey)) {
      recipients.set(principalKey, serviceAccountExists(principal.id));
    }
  }

  // Wait for every answer, including those shared with earlier calls, and refuse the first missing
  // principal in input order, so that the error doesn't depend on which lookup finished first.
  const exists = await Promise.all(
    principals.map((principal) => recipients.get(getRecipientKey(principal)))
  );
  const unknown = principals.find((_, index) => !exists[index]);
  if (unknown) {
    const kind = unknown.type === 'user' ? 'User' : 'Service account';
    throw new AclChangeError('bad_request', `${kind} ${unknown.id} cannot receive access.`);
  }
};
