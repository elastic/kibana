/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import { rgba } from 'polished';
import styled, { css } from 'styled-components';

export const OFFSET_SCROLLBAR = 17;

export const EventsTable = styled.div.attrs({
  className: 'siemEventsTable',
  role: 'table',
})<{ tableHeight: number }>`
  ${({ tableHeight, theme }) => css`
    height: ${tableHeight + 'px'};
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

export const EventsThead = styled.div.attrs({
  className: 'siemEventsTable__thead',
  role: 'rowgroup',
})<{ minWidth: number }>`
  ${({ theme }) => css`
    background-color: ${theme.eui.euiColorEmptyShade}
    border-bottom: ${theme.eui.euiBorderWidthThick} solid ${theme.eui.euiColorLightShade};
    min-width: ${({ minWidth }) => `${minWidth}px`};
    position: sticky;
    top: 0;
    z-index: ${theme.eui.euiZLevel1};
  `}
`;
EventsThead.displayName = 'EventsThead';

export const EventsTrHeader = styled.div.attrs({
  className: 'siemEventsTable__trHeader',
  role: 'row',
})`
  display: flex;
`;
EventsTrHeader.displayName = 'EventsTrHeader';

export const EventsThGroupActions = styled.div.attrs({
  className: 'siemEventsTable__thGroupActions',
})<{ actionsColumnWidth: number }>`
  display: flex;
  flex: 0 0 ${({ actionsColumnWidth }) => actionsColumnWidth + 'px'};
  justify-content: space-between;
  min-width: 0;
`;
EventsThGroupActions.displayName = 'EventsThGroupActions';

export const EventsThGroupData = styled.div.attrs({
  className: 'siemEventsTable__thGroupData',
})`
  display: flex;
`;
EventsThGroupData.displayName = 'EventsThGroupData';

export const EventsTh = styled.div.attrs({
  className: 'siemEventsTable__th',
  role: 'columnheader',
})<{ isDragging?: boolean; position?: string; colWidth?: string }>`
  align-items: center;
  display: flex;
  min-width: 0;
  position: ${({ position }) => position};

  ${({ colWidth }) =>
    colWidth &&
    css`
      flex: 0 0 ${colWidth};
    `}

  .siemEventsTable__thGroupActions &:first-child:last-child {
    flex: 1;
  }

  .siemEventsTable__thGroupData &:hover {
    background-color: ${({ theme }) => theme.eui.euiTableHoverColor};
  }
`;
EventsTh.displayName = 'EventsTh';

export const EventsThContent = styled.div.attrs({
  className: 'siemEventsTable__thContent',
})<{ textAlign?: string }>`
  ${({ textAlign, theme }) => css`
    flex: 1;
    font-size: ${theme.eui.euiFontSizeXS};
    font-weight: ${theme.eui.euiFontWeightSemiBold};
    line-height: ${theme.eui.euiLineHeight};
    max-width: 100%;
    min-width: 0;
    padding: ${theme.eui.paddingSizes.xs};
    text-align: ${textAlign};
  `}
`;
EventsThContent.displayName = 'EventsThContent';

export const EventsTbody = styled.div.attrs({
  className: 'siemEventsTable__tbody',
  role: 'rowgroup',
})<{ minWidth: number }>`
  min-width: ${({ minWidth }) => minWidth + 'px'};
  overflow-x: hidden;
`;
EventsTbody.displayName = 'EventsTbody';

export const EventsTrGroup = styled.div.attrs({
  className: 'siemEventsTable__trGroup',
})<{ className?: string }>`
  ${({ theme }) => css`
    border-bottom: ${theme.eui.euiBorderWidthThin} solid ${theme.eui.euiColorLightShade};

    &:hover {
      background-color: ${theme.eui.euiTableHoverColor};
    }
  `}
`;
EventsTrGroup.displayName = 'EventsTrGroup';

export const EventsTrData = styled.div.attrs({
  className: 'siemEventsTable__trData',
  role: 'row',
})`
  display: flex;
`;
EventsTrData.displayName = 'EventsTrData';

export const EventsTrSupplement = styled.div.attrs({
  className: 'siemEventsTable__trSupplement',
})<{ className: string }>`
  ${({ theme }) => css`
    font-size: ${theme.eui.euiFontSizeXS};
    line-height: ${theme.eui.euiLineHeight};
    padding: 0 ${theme.eui.paddingSizes.xs} 0 ${theme.eui.paddingSizes.xl};
  `}
`;
EventsTrSupplement.displayName = 'EventsTrSupplement';

export const EventsTdGroupActions = styled.div.attrs({
  className: 'siemEventsTable__tdGroupActions',
})<{ actionsColumnWidth: number }>`
  display: flex;
  justify-content: space-between;
  flex: 0 0 ${({ actionsColumnWidth }) => actionsColumnWidth + 'px'};
  min-width: 0;
`;
EventsTdGroupActions.displayName = 'EventsTdGroupActions';

export const EventsTdGroupData = styled.div.attrs({
  className: 'siemEventsTable__tdGroupData',
})`
  display: flex;
`;
EventsTdGroupData.displayName = 'EventsTdGroupData';

export const EventsTd = styled.div.attrs({
  className: 'siemEventsTable__td',
  role: 'cell',
})<{ colWidth?: string }>`
  align-items: center;
  display: flex;
  min-width: 0;

  ${({ colWidth }) =>
    colWidth &&
    css`
      flex: 0 0 ${colWidth};
    `}

  .siemEventsTable__tdGroupActions &:first-child:last-child {
    flex: 1;
  }
`;
EventsTd.displayName = 'EventsTd';

export const EventsTdContent = styled.div.attrs({
  className: 'siemEventsTable__tdContent',
})<{ textAlign?: string }>`
  ${({ textAlign, theme }) => css`
    flex: 1;
    font-size: ${theme.eui.euiFontSizeXS};
    line-height: ${theme.eui.euiLineHeight};
    max-width: 100%;
    min-width: 0;
    padding: ${theme.eui.paddingSizes.xs};
    text-align: ${textAlign};
  `}
`;
EventsTdContent.displayName = 'EventsTdContent';

export const EventsHeading = styled.div.attrs({
  className: 'siemEventsHeading',
})<{ isLoading: boolean }>`
  align-items: center;
  display: flex;

  &:hover {
    cursor: ${({ isLoading }) => (isLoading ? 'wait' : 'grab')};
  }
`;
EventsHeading.displayName = 'EventsHeading';

export const EventsHeadingTitleButton = styled.button.attrs({
  className: 'siemEventsHeading__title siemEventsHeading__title--aggregatable',
  type: 'button',
})`
  ${({ theme }) => css`
    align-items: center;
    display: flex;
    font-weight: inherit;
    min-width: 0;

    &:hover,
    &:focus {
      color: ${theme.eui.euiColorPrimary};
      text-decoration: underline;
    }

    &:hover {
      cursor: pointer;
    }

    & > * + * {
      margin-left: ${theme.eui.euiSizeXS};
    }
  `}
`;
EventsHeadingTitleButton.displayName = 'EventsHeadingTitleButton';

export const EventsHeadingTitleSpan = styled.span.attrs({
  className: 'siemEventsHeading__title siemEventsHeading__title--notAggregatable',
})`
  min-width: 0;
`;
EventsHeadingTitleSpan.displayName = 'EventsHeadingTitleSpan';

export const EventsHeadingExtra = styled.div.attrs({
  className: 'siemEventsHeading__extra',
})<{ className?: string }>`
  ${({ theme }) => css`
    margin-left: auto;

    &.siemEventsHeading__extra--close {
      opacity: 0;
      transition: all ${theme.eui.euiAnimSpeedNormal} ease;
      visibility: hidden;

      .siemEventsTable__th:hover & {
        opacity: 1;
        visibility: visible;
      }
    }
  `}
`;
EventsHeadingExtra.displayName = 'EventsHeadingExtra';

export const EventsHeadingHandle = styled.div.attrs({
  className: 'siemEventsHeading__handle',
})`
  ${({ theme }) => css`
    background-color: ${theme.eui.euiBorderColor};
    height: 100%;
    opacity: 0;
    transition: all ${theme.eui.euiAnimSpeedNormal} ease;
    visibility: hidden;
    width: ${theme.eui.euiBorderWidthThick};

    .siemEventsTable__thead:hover & {
      opacity: 1;
      visibility: visible;
    }

    &:hover {
      background-color: ${theme.eui.euiColorPrimary};
      cursor: col-resize;
    }
  `}
`;
EventsHeadingHandle.displayName = 'EventsHeadingHandle';

export const EventsLoading = styled(EuiLoadingSpinner)`
  margin: ${({ theme }) => theme.eui.euiSizeXS};
  vertical-align: top;
`;
