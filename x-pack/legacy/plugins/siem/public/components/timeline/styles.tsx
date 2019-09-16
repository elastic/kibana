/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { rgba } from 'polished';
import styled, { css } from 'styled-components';

import { footerHeight } from './footer';

export const EventsTable = styled.div<{ height: number }>`
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
EventsTable.displayName = 'EventsTable';

export const EventsThead = styled.div<{ minWidth: number }>`
  ${({ theme }) => css`
    background-color: ${theme.eui.euiColorEmptyShade}
    border-bottom: 2px solid ${theme.eui.euiColorLightShade};
    display: flex;
    min-width: ${({ minWidth }) => `${minWidth}px`};
    position: sticky;
    top: 0;
    z-index: ${theme.eui.euiZLevel1};
  `}
`;
EventsThead.displayName = 'EventsThead';

export const EventsTheadActions = styled.div<{ actionsColumnWidth: number }>`
  display: flex;
  justify-content: space-between;
  width: ${({ actionsColumnWidth }) => actionsColumnWidth}px;
`;
EventsTheadActions.displayName = 'EventsTheadActions';

export const EventsTheadData = styled.div`
  display: flex;
`;
EventsTheadData.displayName = 'EventsTheadData';

export const EventsTh = styled.div<{ isDragging?: boolean; width?: string }>`
  align-items: center;
  display: flex;
  width: ${({ width }) => width};
`;
EventsTh.displayName = 'EventsTh';

export const EventsThContent = styled.div<{ textAlign?: string }>`
  ${({ theme }) => css`
    flex: 1;
    font-size: ${theme.eui.euiFontSizeXS};
    font-weight: ${theme.eui.euiFontWeightSemiBold};
    line-height: ${theme.eui.euiLineHeight};
    max-width: 100%;
    min-width: 0;
    padding: ${theme.eui.paddingSizes.xs};
    text-align: ${({ textAlign }) => textAlign};
  `}
`;
EventsThContent.displayName = 'EventsThContent';

export const EventsTbody = styled.div<{ minWidth: number }>`
  min-width: ${({ minWidth }) => minWidth + 'px'};
`;
EventsTbody.displayName = 'EventsTbody';

export const EventsTrGroup = styled.div`
  ${({ theme }) => css`
    & + & {
      border-top: ${theme.eui.euiBorderWidthThin} solid ${theme.eui.euiColorLightShade};
    }

    &:hover {
      background-color: ${theme.eui.euiTableHoverColor};
    }
  `}
`;
EventsTrGroup.displayName = 'EventsTrGroup';

export const EventsTrData = styled.div`
  display: flex;
`;
EventsTrData.displayName = 'EventsTrData';

export const EventsTrNotes = styled.div`
  padding-left: ${({ theme }) => theme.eui.paddingSizes.xl};
`;
EventsTrNotes.displayName = 'EventsTrNotes';

export const EventsTrAttributes = styled.div`
  padding-left: ${({ theme }) => theme.eui.paddingSizes.xl};
`;
EventsTrAttributes.displayName = 'EventsTrAttributes';

export const EventsTdGroupActions = styled.div<{ actionsColumnWidth: number }>`
  display: flex;
  justify-content: space-between;
  width: ${({ actionsColumnWidth }) => actionsColumnWidth + 'px'};
`;
EventsTdGroupActions.displayName = 'EventsTdGroupActions';

export const EventsTdGroupData = styled.div`
  display: flex;
`;
EventsTdGroupData.displayName = 'EventsTdGroupData';

export const EventsTd = styled.div<{ width?: string }>`
  align-items: center;
  display: flex;
  width: ${({ width }) => width};
`;
EventsTd.displayName = 'EventsTd';

export const EventsTdContent = styled.div<{ textAlign?: string }>`
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
EventsTdContent.displayName = 'EventsTdContent';
