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

function legacyMapHasAnyDismissed(map: Record<string, boolean>): boolean {
  return Object.values(map).some((v) => v === true);
}

/**
 * Returns whether the announcement was dismissed for the current user (all spaces).
 * When user profiles are disabled, returns true so the modal is not shown (dismissal cannot persist).
 */
export async function getAnnouncementModalSeen(
  userProfile: UserProfileServiceStart
): Promise<boolean> {
  const enabled = await firstValueFrom(userProfile.getEnabled$().pipe(take(1)));
  if (!enabled) {
    return true;
  }
  try {
    const profile = await userProfile.getCurrent<{
      userSettings?: {
        agentBuilderAnnouncementModalSeen?: boolean;
        agentBuilderAnnouncementModalSeenBySpaceJson?: string;
      };
    }>({ dataPath: 'userSettings' });
    const settings = profile?.data?.userSettings;
    if (settings?.agentBuilderAnnouncementModalSeen === true) {
      return true;
    }
    const map = parseSeenMap(settings?.agentBuilderAnnouncementModalSeenBySpaceJson);
    return legacyMapHasAnyDismissed(map);
  } catch {
    return true;
  }
}

/**
 * Persists global dismissal in user profile data.
 * No-ops when user profiles are disabled.
 */
export async function setAnnouncementModalSeen(
  userProfile: UserProfileServiceStart
): Promise<void> {
  const enabled = await firstValueFrom(userProfile.getEnabled$().pipe(take(1)));
  if (!enabled) {
    return;
  }
  try {
    const profile = await userProfile.getCurrent<{
      userSettings?: {
        agentBuilderAnnouncementModalSeen?: boolean;
        agentBuilderAnnouncementModalSeenBySpaceJson?: string;
      };
    }>({ dataPath: 'userSettings' });
    const existing = profile?.data?.userSettings ?? {};
    const { agentBuilderAnnouncementModalSeenBySpaceJson, ...rest } = existing;
    void agentBuilderAnnouncementModalSeenBySpaceJson;
    await userProfile.partialUpdate({
      userSettings: {
        ...rest,
        agentBuilderAnnouncementModalSeen: true,
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
  userProfile: UserProfileServiceStart
): UseAgentBuilderAnnouncementModalSeenStateResult {
  const [isSeen, setIsSeen] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(false);
    let cancelled = false;
    void (async () => {
      const seen = await getAnnouncementModalSeen(userProfile);
      if (!cancelled) {
        setIsSeen(seen);
        setIsReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userProfile]);

  const markSeen = useCallback(async () => {
    await setAnnouncementModalSeen(userProfile);
    setIsSeen(true);
  }, [userProfile]);

  return { isSeen, isReady, markSeen };
}
