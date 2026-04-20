/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import { firstValueFrom, take } from 'rxjs';
import type { UserProfileServiceStart } from '@kbn/core-user-profile-browser';

function parseSeenMap(json: string | undefined): Record<string, boolean> {
  if (!json) {
    return {};
  }
  try {
    const parsed = JSON.parse(json) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, boolean>;
    }
  } catch {
    // ignore invalid JSON
  }
  return {};
}

/**
 * Returns whether the announcement was dismissed for this space in the current user's profile.
 * When user profiles are disabled, returns true so the modal is not shown (dismissal cannot persist).
 */
export async function getAnnouncementModalSeenForSpace(
  userProfile: UserProfileServiceStart,
  spaceId: string
): Promise<boolean> {
  const enabled = await firstValueFrom(userProfile.getEnabled$().pipe(take(1)));
  if (!enabled) {
    return true;
  }
  try {
    const profile = await userProfile.getCurrent<{
      userSettings?: { agentBuilderAnnouncementModalSeenBySpaceJson?: string };
    }>({ dataPath: 'userSettings' });
    const raw = profile?.data?.userSettings?.agentBuilderAnnouncementModalSeenBySpaceJson;
    const map = parseSeenMap(raw);
    return map[spaceId] === true;
  } catch {
    return true;
  }
}

/**
 * Persists dismissal for the current space in user profile data.
 * No-ops when user profiles are disabled.
 */
export async function setAnnouncementModalSeenForSpace(
  userProfile: UserProfileServiceStart,
  spaceId: string
): Promise<void> {
  const enabled = await firstValueFrom(userProfile.getEnabled$().pipe(take(1)));
  if (!enabled) {
    return;
  }
  try {
    const profile = await userProfile.getCurrent<{
      userSettings?: { agentBuilderAnnouncementModalSeenBySpaceJson?: string };
    }>({ dataPath: 'userSettings' });
    const existing = profile?.data?.userSettings ?? {};
    const map = parseSeenMap(existing.agentBuilderAnnouncementModalSeenBySpaceJson);
    map[spaceId] = true;
    await userProfile.partialUpdate({
      userSettings: {
        ...existing,
        agentBuilderAnnouncementModalSeenBySpaceJson: JSON.stringify(map),
      },
    });
  } catch {
    // No browser fallback; UI still hides via local isDismissed on the controller.
  }
}

export interface UseAgentBuilderAnnouncementModalSeenStateResult {
  isSeen: boolean;
  isReady: boolean;
  markSeen: () => Promise<void>;
}

export function useAgentBuilderAnnouncementModalSeenState(
  userProfile: UserProfileServiceStart,
  spaceId: string | undefined
): UseAgentBuilderAnnouncementModalSeenStateResult {
  const [isSeen, setIsSeen] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!spaceId) {
      setIsReady(false);
      return;
    }
    setIsReady(false);
    let cancelled = false;
    void (async () => {
      const seen = await getAnnouncementModalSeenForSpace(userProfile, spaceId);
      if (!cancelled) {
        setIsSeen(seen);
        setIsReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userProfile, spaceId]);

  const markSeen = useCallback(async () => {
    if (!spaceId) {
      return;
    }
    await setAnnouncementModalSeenForSpace(userProfile, spaceId);
    setIsSeen(true);
  }, [userProfile, spaceId]);

  return { isSeen, isReady, markSeen };
}
