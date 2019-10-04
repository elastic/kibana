/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import styled from 'styled-components';

export const TIMELINE_RESIZE_HANDLE_WIDTH = 2; // px

export const CommonResizeHandle = styled.div`
  cursor: col-resize;
  height: 100%;
  min-height: 20px;
  width: 0;
`;
CommonResizeHandle.displayName = 'CommonResizeHandle';

export const TimelineResizeHandle = styled(CommonResizeHandle)<{ height: number }>`
  border: ${TIMELINE_RESIZE_HANDLE_WIDTH}px solid ${props => props.theme.eui.euiColorLightShade};
  z-index: 2;
  height: ${({ height }) => `${height}px`};
  position: absolute;
`;
TimelineResizeHandle.displayName = 'TimelineResizeHandle';
