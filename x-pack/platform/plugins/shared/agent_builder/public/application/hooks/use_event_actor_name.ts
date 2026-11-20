/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EventActorType, getEventActorDisplayName } from '@kbn/agent-builder-common';
import type { EventActor } from '@kbn/agent-builder-common';
import { getUserDisplayName } from '@kbn/user-profile-components';
import { useUserProfiles } from './use_user_profiles';

/** Resolves the display name of an event actor, preferring the Kibana profile of a user actor. */
export const useEventActorName = (actor: EventActor): string | undefined => {
  // Actors from an external system are identified by that system, not by a Kibana profile uid.
  const isKibanaUser = actor.type === EventActorType.user && !actor.origin;
  const { data: profiles = [] } = useUserProfiles({ uids: isKibanaUser ? [actor.id] : [] });
  const [profile] = profiles;

  return profile ? getUserDisplayName(profile.user) : getEventActorDisplayName(actor);
};
