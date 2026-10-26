/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { css } from '@emotion/react';
import { EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useReactFlow } from '@xyflow/react';
import { FIT_VIEW_DURATION, FIT_VIEW_PADDING } from './canvas_constants';
import type { ConnectedFlow } from './connected_flow';

interface CanvasSearchOverlayProps {
  flow: ConnectedFlow | undefined;
}

export function CanvasSearchOverlay({ flow }: CanvasSearchOverlayProps) {
  const { fitView } = useReactFlow();
  const matchedNodesKey = useMemo(() => (flow ? [...flow.nodeIds].sort().join('|') : ''), [flow]);
  const framedKeyRef = useRef(matchedNodesKey);

  useEffect(() => {
    if (framedKeyRef.current === matchedNodesKey) {
      return;
    }
    framedKeyRef.current = matchedNodesKey;
    // React Flow queues this until newly shown nodes are measured.
    void fitView({ padding: FIT_VIEW_PADDING, duration: FIT_VIEW_DURATION });
  }, [fitView, matchedNodesKey]);

  if (!flow || flow.nodeIds.size > 0) {
    return null;
  }

  return (
    <div
      data-test-subj="streamsCanvasSearchNoMatches"
      css={css`
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: none;
      `}
    >
      <EuiEmptyPrompt
        color="transparent"
        hasBorder={false}
        hasShadow={false}
        titleSize="s"
        iconType="search"
        title={
          <h2>
            {i18n.translate('xpack.streams.canvas.search.noMatchesTitle', {
              defaultMessage: 'No streams match your search',
            })}
          </h2>
        }
        body={i18n.translate('xpack.streams.canvas.search.noMatchesDescription', {
          defaultMessage: 'Adjust your search to see more of the canvas.',
        })}
      />
    </div>
  );
}
