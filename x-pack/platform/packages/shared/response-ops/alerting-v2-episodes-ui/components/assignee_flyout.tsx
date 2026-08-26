/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { OverlayStart } from '@kbn/core-overlays-browser';
import type { QueryClient } from '@kbn/react-query';
import { QueryClientProvider } from '@kbn/react-query';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { EditEpisodeAssigneeFlyout } from './actions/edit_episode_assignee_flyout';

export interface OpenAssigneeFlyoutDeps {
  queryClient: QueryClient;
  /**
   * Kibana services consumed by `EditEpisodeAssigneeFlyout` via `useKibana`
   * (notifications, http, userProfile, docLinks). Forwarded into a fresh
   * `KibanaContextProvider` because the overlay mounts in a separate React root.
   */
  // Typed loosely to avoid coupling this package to a specific KibanaServices shape.
  kibanaServices: Record<string, unknown>;
}

interface OpenAssigneeFlyoutOptions {
  /**
   * Pre-populates the picker. Pass the row's current uid for single-row usage,
   * or `null` for bulk where there's no shared "current" value.
   */
  lastAssigneeUid?: string | null;
  /**
   * Number of episodes the action will apply to. When > 1, the flyout keeps
   * Save enabled even with an empty selection so the user can clear assignees
   * across multiple rows. Defaults to 1.
   */
  episodeCount?: number;
}

/**
 * Pick an assignee for a bulk-action flow. Resolves with the chosen uid (or
 * `null` to clear) on save, or `undefined` if the user cancels. Does not post
 * any action — the caller is responsible for fanning out one ASSIGN per episode.
 */
export const openAssigneeFlyout = (
  overlays: OverlayStart,
  rendering: CoreStart['rendering'],
  deps: OpenAssigneeFlyoutDeps,
  { lastAssigneeUid = null, episodeCount = 1 }: OpenAssigneeFlyoutOptions = {}
): Promise<string | null | undefined> => {
  return new Promise<string | null | undefined>((resolve) => {
    const ref = overlays.openFlyout(
      toMountPoint(
        <KibanaContextProvider services={deps.kibanaServices}>
          <QueryClientProvider client={deps.queryClient}>
            <EditEpisodeAssigneeFlyout
              embedded
              episodeCount={episodeCount}
              lastAssigneeUid={lastAssigneeUid}
              onClose={() => {
                ref.close();
                resolve(undefined);
              }}
              onSave={(uid) => {
                ref.close();
                resolve(uid);
              }}
            />
          </QueryClientProvider>
        </KibanaContextProvider>,
        rendering
      )
    );
  });
};
