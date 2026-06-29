/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import { layoutLevels, layoutVar } from '@kbn/ui-chrome-layout-constants';
import { ROUNDED_BORDER_RADIUS_LARGE } from '../common.styles';

/** Fixed overlay shell covering the application workspace column (not the scroll container). */
export const applicationWorkspaceFixedOverlayStyles = css`
  position: fixed;
  top: ${layoutVar('application.top', '0px')};
  left: ${layoutVar('application.left', '0px')};
  right: ${layoutVar('application.right', '0px')};
  bottom: ${layoutVar('application.bottom', '0px')};
  z-index: ${layoutLevels.applicationTopBar + 1};
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-radius: ${ROUNDED_BORDER_RADIUS_LARGE};
  overflow: hidden;
`;
