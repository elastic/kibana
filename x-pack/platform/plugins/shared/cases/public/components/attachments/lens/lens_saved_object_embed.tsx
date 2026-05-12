/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import type { TimeRange } from '@kbn/es-query';
import { EuiLoadingSpinner } from '@elastic/eui';
import { useKibana } from '../../../common/lib/kibana';
import { LensRenderer } from './lens_renderer';
import { LensReferenceEvent } from './reference_event';
import type { LensProps } from './types';

interface Props {
  attachmentId: string;
  title?: string;
  /**
   * Verbatim `LensSavedObjectAttributes` snapshot taken at attach-time
   * (with `references` inlined). Used as the inline-render fallback when
   * the live SO fetch fails (deletion, permissions, cross-space).
   */
  snapshot?: LensProps['attributes'];
  timeRange?: TimeRange;
}

interface LensContentManagementResponse {
  item?: {
    attributes?: Record<string, unknown>;
    references?: Array<{ type: string; id: string; name: string }>;
  };
}

type FetchState =
  | { kind: 'loading' }
  | { kind: 'live'; attributes: LensProps['attributes'] }
  | { kind: 'failed' };

/**
 * Live-with-snapshot-fallback renderer for lens SO attachments. Re-fetches
 * the lens SO at render time (so subsequent edits to the source viz are
 * reflected); on failure falls back to the cached snapshot; if neither is
 * available shows a title-only event.
 *
 * The public lens `EmbeddableComponent` only supports by-value rendering, so
 * we resolve the SO ourselves via content management and merge the SO's
 * top-level `references` into `attributes.references` (the embeddable reads
 * data view refs from there).
 */
export const LensSavedObjectEmbed = React.memo<Props>(
  ({ attachmentId, title, snapshot, timeRange }) => {
    const {
      services: { contentManagement },
    } = useKibana();
    const [state, setState] = useState<FetchState>({ kind: 'loading' });

    useEffect(() => {
      let cancelled = false;
      (async () => {
        try {
          const result = (await contentManagement.client.get({
            contentTypeId: 'lens',
            id: attachmentId,
          })) as LensContentManagementResponse | undefined;
          const attributes = result?.item?.attributes;
          if (!attributes) {
            if (!cancelled) setState({ kind: 'failed' });
            return;
          }
          const references = result?.item?.references ?? [];
          const merged = {
            ...attributes,
            references,
          } as unknown as LensProps['attributes'];
          if (!cancelled) setState({ kind: 'live', attributes: merged });
        } catch {
          if (!cancelled) setState({ kind: 'failed' });
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [contentManagement, attachmentId]);

    if (state.kind === 'loading') {
      return <EuiLoadingSpinner size="m" data-test-subj="cases-lens-so-loading" />;
    }

    if (state.kind === 'live') {
      return <LensRenderer attributes={state.attributes} timeRange={timeRange} />;
    }

    if (snapshot) {
      return <LensRenderer attributes={snapshot} timeRange={timeRange} />;
    }

    return <LensReferenceEvent savedObjectId={attachmentId} title={title} />;
  }
);

LensSavedObjectEmbed.displayName = 'LensSavedObjectEmbed';
