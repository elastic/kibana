/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import styled, { css } from 'styled-components';

import { footerHeight } from './footer';

export const HorizontalScroll = styled.div<{
  height: number;
}>`
  display: block;
  height: ${({ height }) => height + 'px'};
  overflow: hidden;
  overflow-x: auto;
  min-height: 0px;
`;
HorizontalScroll.displayName = 'HorizontalScroll';

export const VerticalScrollContainer = styled.div<{
  height: number;
  minWidth: number;
}>`
  display: block;
  height: ${({ height }) => `${height - footerHeight - 12}px`};
  overflow: hidden;
  overflow-y: auto;
  min-width: ${({ minWidth }) => `${minWidth}px`};
`;
VerticalScrollContainer.displayName = 'VerticalScrollContainer';

export const EventsContainer = styled.div<{
  minWidth: number;
}>`
  display: block;
  min-width: ${({ minWidth }) => minWidth + 'px'};
  overflow: hidden;
`;
EventsContainer.displayName = 'EventsContainer';

export const TimelineRow = styled.div`
  ${props => css`
    border-top: ${props.theme.eui.euiBorderWidthThin} solid ${props.theme.eui.euiColorLightShade};
    display: flex;

    &:hover {
      background-color: ${props.theme.eui.euiTableHoverColor};
    }
  `}
`;
TimelineRow.displayName = 'TimelineRow';

export const TimelineRowGroup = styled.div`
  display: flex;
`;
TimelineRowGroup.displayName = 'TimelineRowGroup';

export const TimelineRowGroupActions = styled.div<{ actionsColumnWidth: number }>`
  display: flex;
  justify-content: space-between;
  width: ${({ actionsColumnWidth }) => actionsColumnWidth + 'px'};
`;
TimelineRowGroupActions.displayName = 'TimelineRowGroupActions';

export const TimelineRowGroupData = styled.div`
  display: flex;
`;
TimelineRowGroupData.displayName = 'TimelineRowGroupData';

export const TimelineCell = styled.div<{ width?: string }>`
  align-items: center;
  display: flex;
  width: ${({ width }) => width};
`;
TimelineCell.displayName = 'TimelineCell';

export const TimelineCellContent = styled.div<{ textAlign?: string }>`
  ${props => css`
    flex: 1;
    font-size: ${props.theme.eui.euiFontSizeXS};
    line-height: ${props.theme.eui.euiLineHeight};
    max-width: 100%;
    min-width: 0;
    padding: ${props.theme.eui.paddingSizes.xs};
    text-align: ${({ textAlign }) => textAlign};
  `}
`;
TimelineCellContent.displayName = 'TimelineCellContent';
