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
import { useOnboardingLink } from '../../../../hooks/use_onboarding_link';

/**
 * Overlay shown when the canvas has nothing to draw. Sits above the grid rather
 * than replacing it so the surface still reads as a canvas and the floating
 * toolbar, zoom, and minimap stay usable.
 */
export function CanvasEmptyState() {
  const onboardingLink = useOnboardingLink();

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
                {i18n.translate('xpack.streams.canvas.emptyState.body', {
                  defaultMessage:
                    'Streams represent how your logs and metrics travel from sources through pipelines to destinations. Connect sources, shape data, route it anywhere, and inspect the full flow as an interactive graph. Start by onboarding data into Elastic.',
                })}
              </p>
            </EuiText>
          }
          actions={
            <EuiButton
              color="primary"
              fill
              href={onboardingLink}
              data-test-subj="streamsCanvasEmptyStateAddData"
              css={css`
                pointer-events: auto;
              `}
            >
              {i18n.translate('xpack.streams.canvas.emptyState.addDataButton', {
                defaultMessage: 'Add data',
              })}
            </EuiButton>
          }
        />
      </div>
    </div>
  );
}
