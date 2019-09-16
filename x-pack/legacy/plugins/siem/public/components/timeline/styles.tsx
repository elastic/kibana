/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { rgba } from 'polished';
import styled, { css } from 'styled-components';

import { footerHeight } from './footer';

export const TimelineScroll = styled.div<{ height: number }>`
  ${({ height, theme }) => css`
    height: ${height + 'px'};
    overflow: auto;
    scrollbar-width: thin;

    &::-webkit-scrollbar {
      height: ${theme.eui.euiScrollBar};
      width: ${theme.eui.euiScrollBar};
    }

    &::-webkit-scrollbar-thumb {
      background-clip: content-box;
      background-color: ${rgba(theme.eui.euiColorDarkShade, 0.5)};
      border: ${theme.eui.euiScrollBarCorner} solid transparent;
    }

    &::-webkit-scrollbar-corner,
    &::-webkit-scrollbar-track {
      background-color: transparent;
    }
  `}
`;
TimelineScroll.displayName = 'TimelineScroll';

export const EventsContainer = styled.div<{ minWidth: number }>`
  min-width: ${({ minWidth }) => minWidth + 'px'};
`;
EventsContainer.displayName = 'EventsContainer';

export const TimelineEvent = styled.div`
  ${({ theme }) => css`
    & + & {
      border-top: ${theme.eui.euiBorderWidthThin} solid ${theme.eui.euiColorLightShade};
    }

    &:hover {
      background-color: ${theme.eui.euiTableHoverColor};
    }
  `}
`;
TimelineEvent.displayName = 'TimelineEvent';

export const TimelineRow = styled.div`
  display: flex;
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
  ${({ theme }) => css`
    flex: 1;
    font-size: ${theme.eui.euiFontSizeXS};
    line-height: ${theme.eui.euiLineHeight};
    max-width: 100%;
    min-width: 0;
    padding: ${theme.eui.paddingSizes.xs};
    text-align: ${({ textAlign }) => textAlign};
  `}
`;
TimelineCellContent.displayName = 'TimelineCellContent';
