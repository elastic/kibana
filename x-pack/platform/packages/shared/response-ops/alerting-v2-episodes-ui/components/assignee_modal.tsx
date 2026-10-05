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
import { EditEpisodeAssigneeModal } from './actions/edit_episode_assignee_modal';

export interface OpenAssigneeModalDeps {
  queryClient: QueryClient;
  /**
   * Kibana services consumed by `EpisodeAssigneePanel` via `useKibana`
   * (notifications, userProfile, docLinks). Forwarded into a fresh
   * `KibanaContextProvider` because the overlay mounts in a separate React root.
   */
  // Typed loosely to avoid coupling this package to a specific KibanaServices shape.
  kibanaServices: Record<string, unknown>;
}

interface OpenAssigneeModalOptions {
  /**
   * Pre-populates the picker. Pass the row's current uid for single-episode
   * usage, or `null` for bulk where there's no shared "current" value.
   */
  assigneeUid?: string | null;
  /**
   * Number of episodes the action will apply to. When > 1, the panel keeps
   * Apply enabled even with an empty selection so the user can clear assignees
   * across multiple rows. Defaults to 1.
   */
  episodeCount?: number;
}

/**
 * Pick an assignee from a surface that has nothing to anchor a popover to.
 * Resolves with the chosen uid (or `null` to clear) on apply, or `undefined` if
 * the user dismisses the modal. Does not post any action — the caller is
 * responsible for fanning out one ASSIGN per episode.
 */
export const openAssigneeModal = (
  overlays: OverlayStart,
  rendering: CoreStart['rendering'],
  deps: OpenAssigneeModalDeps,
  { assigneeUid = null, episodeCount = 1 }: OpenAssigneeModalOptions = {}
): Promise<string | null | undefined> => {
  return new Promise<string | null | undefined>((resolve) => {
    let applied: string | null | undefined;

    const ref = overlays.openModal(
      toMountPoint(
        <KibanaContextProvider services={deps.kibanaServices}>
          <QueryClientProvider client={deps.queryClient}>
            <EditEpisodeAssigneeModal
              assigneeUid={assigneeUid}
              episodeCount={episodeCount}
              onClose={() => ref.close()}
              onApply={(uid) => {
                applied = uid;
              }}
            />
          </QueryClientProvider>
        </KibanaContextProvider>,
        rendering
      )
    );

    // `onClosed` also fires for Esc and backdrop dismissals, so resolving here
    // keeps the "cancelled" path (`undefined`) correct however the modal ends.
    ref.onClose.then(() => resolve(applied));
  });
};
