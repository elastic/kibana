/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css, keyframes } from '@emotion/react';
import { euiCanAnimate, type EuiThemeComputed } from '@elastic/eui';

/** Footprint shared by the thumbnail attachment pill and its uploading-state placeholder. */
export const ATTACHMENT_PILL_WIDTH = 72;
export const ATTACHMENT_PILL_HEIGHT = 32;

const IMAGE_UPLOAD_PROGRESS_DURATION = '1.4s';
const IMAGE_UPLOAD_PROGRESS_FILL_WIDTH = '40%';
const IMAGE_UPLOAD_PROGRESS_RADIUS = '999px';

export const imageUploadProgressSweepKeyframes = keyframes`
  0% { transform: translateX(-100%); }
  100% { transform: translateX(250%); }
`;

/** Fill bar for an indeterminate upload-progress sweep, absolutely positioned within its track. */
export const imageUploadProgressFillStyles = (euiTheme: EuiThemeComputed) => css`
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: ${IMAGE_UPLOAD_PROGRESS_FILL_WIDTH};
  border-radius: ${IMAGE_UPLOAD_PROGRESS_RADIUS};
  background: ${euiTheme.colors.backgroundFilledText};
  ${euiCanAnimate} {
    animation: ${imageUploadProgressSweepKeyframes} ${IMAGE_UPLOAD_PROGRESS_DURATION} ease-in-out
      infinite;
  }
`;

export const imageUploadProgressTrackColorStyles = (euiTheme: EuiThemeComputed) => css`
  border-radius: ${IMAGE_UPLOAD_PROGRESS_RADIUS};
  background: ${euiTheme.colors.backgroundLightText};
  overflow: hidden;
`;
