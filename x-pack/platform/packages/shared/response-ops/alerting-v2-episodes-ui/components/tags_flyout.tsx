/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { OverlayStart } from '@kbn/core-overlays-browser';
import type { HttpStart } from '@kbn/core-http-browser';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { QueryClient } from '@kbn/react-query';
import { QueryClientProvider } from '@kbn/react-query';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { AlertEpisodeTagsFlyout } from './actions/edit_episode_tags_flyout';

interface TagsFlyoutInnerProps {
  currentTags: string[];
  http: HttpStart;
  expressions: ExpressionsStart;
  onConfirm: (tags: string[]) => void;
  onCancel: () => void;
}

// `overlays.openFlyout` already provides the outer `EuiFlyout` shell, so we
// mount the content-only variant here to avoid nesting two flyouts.
export const TagsFlyoutInner = ({
  currentTags,
  http,
  expressions,
  onConfirm,
  onCancel,
}: TagsFlyoutInnerProps) => {
  return (
    <AlertEpisodeTagsFlyout
      embedded
      onClose={onCancel}
      groupHash=""
      currentTags={currentTags}
      http={http}
      services={{ expressions }}
      onSave={onConfirm}
    />
  );
};

export const openTagsFlyout = (
  overlays: OverlayStart,
  rendering: CoreStart['rendering'],
  currentTags: string[],
  deps: { http: HttpStart; expressions: ExpressionsStart; queryClient: QueryClient }
): Promise<string[] | undefined> => {
  return new Promise<string[] | undefined>((resolve) => {
    const ref = overlays.openFlyout(
      toMountPoint(
        // `overlays.openFlyout` mounts in a separate React root, so the
        // page-level `QueryClientProvider` is out of scope here. Re-wrap with
        // the same client, so react-query consumers inside the flyout share the
        // page's cache.
        <QueryClientProvider client={deps.queryClient}>
          <TagsFlyoutInner
            currentTags={currentTags}
            http={deps.http}
            expressions={deps.expressions}
            onConfirm={(tags) => {
              ref.close();
              resolve(tags);
            }}
            onCancel={() => {
              ref.close();
              resolve(undefined);
            }}
          />
        </QueryClientProvider>,
        rendering
      )
    );
  });
};
