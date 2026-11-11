/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiButton, EuiEmptyPrompt, EuiIllustration, EuiText } from '@elastic/eui';
import { aerospace } from '@elastic/eui-illustrations';
import { i18n } from '@kbn/i18n';
import { useCanvasReadOnly } from './canvas_read_only_context';

/**
 * Overlay shown when the canvas has nothing to draw. Sits above the grid rather
 * than replacing it so the surface still reads as a canvas and the floating
 * toolbar, zoom, and minimap stay usable.
 */
export function CanvasEmptyState({ onAddSource }: { onAddSource: () => void }) {
  const readOnly = useCanvasReadOnly();

  return (
    <div
      data-test-subj="streamsCanvasEmptyState"
      css={css`
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        // Let panning and the pane context menu reach the canvas underneath;
        // the action re-enables pointer events for itself.
        pointer-events: none;
      `}
    >
      <div
        css={css`
          width: 100%;
          max-width: 400px;
          transform: translateY(-10%);
        `}
      >
        <EuiEmptyPrompt
          color="transparent"
          hasBorder={false}
          hasShadow={false}
          titleSize="s"
          icon={
            <EuiIllustration
              type={aerospace}
              alt=""
              fullWidth={false}
              css={css`
                max-inline-size: 120px;
                margin-inline: auto;
              `}
            />
          }
          title={
            <h2>
              {i18n.translate('xpack.streams.canvas.emptyState.title', {
                defaultMessage: 'See how your data flows in',
              })}
            </h2>
          }
          body={
            <EuiText size="s">
              <p>
                {i18n.translate('xpack.streams.canvas.emptyState.description', {
                  defaultMessage:
                    'The Map draws every source, processing step and destination in one view, so you can trace a document from the agent that sent it to the index it landed in.',
                })}
              </p>
              <p>
                {i18n.translate('xpack.streams.canvas.emptyState.technicalPreviewNote', {
                  defaultMessage: 'Technical preview. Changes made here apply to live ingest.',
                })}
              </p>
            </EuiText>
          }
          actions={
            readOnly ? undefined : (
              <EuiButton
                color="primary"
                fill
                iconType="plus"
                onClick={onAddSource}
                data-test-subj="streamsCanvasEmptyStateAddSource"
                css={css`
                  pointer-events: auto;
                `}
              >
                {i18n.translate('xpack.streams.canvas.emptyState.addSourceButton', {
                  defaultMessage: 'Add source',
                })}
              </EuiButton>
            )
          }
        />
      </div>
    </div>
  );
}
