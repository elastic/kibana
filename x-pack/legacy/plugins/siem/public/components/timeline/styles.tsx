/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import { rgba } from 'polished';
import styled, { createGlobalStyle } from 'styled-components';

import { IS_TIMELINE_FIELD_DRAGGING_CLASS_NAME } from '../drag_and_drop/helpers';

/**
 * OFFSET PIXEL VALUES
 */

export const OFFSET_SCROLLBAR = 17;

/**
 * TIMELINE BODY
 */

// SIDE EFFECT: the following creates a global class selector
export const TimelineBodyGlobalStyle = createGlobalStyle`
  body.${IS_TIMELINE_FIELD_DRAGGING_CLASS_NAME} .siemTimeline__body {
    overflow: hidden;
  }
`;

export const TimelineBody = styled.div.attrs(({ className = '' }) => ({
  className: `siemTimeline__body ${className}`,
}))<{ bodyHeight: number }>`
  height: ${({ bodyHeight }) => bodyHeight + 'px'};
  overflow: auto;
  scrollbar-width: thin;

  &::-webkit-scrollbar {
    height: ${({ theme }) => theme.eui.euiScrollBar};
    width: ${({ theme }) => theme.eui.euiScrollBar};
  }

  &::-webkit-scrollbar-thumb {
    background-clip: content-box;
    background-color: ${({ theme }) => rgba(theme.eui.euiColorDarkShade, 0.5)};
    border: ${({ theme }) => theme.eui.euiScrollBarCorner} solid transparent;
  }

  &::-webkit-scrollbar-corner,
  &::-webkit-scrollbar-track {
    background-color: transparent;
  }
`;
TimelineBody.displayName = 'TimelineBody';

/**
 * EVENTS TABLE
 */

export const EventsTable = styled.div.attrs(({ className = '' }) => ({
  className: `siemEventsTable ${className}`,
  role: 'table',
}))``;
EventsTable.displayName = 'EventsTable';

/* EVENTS HEAD */

export const EventsThead = styled.div.attrs(({ className = '' }) => ({
  className: `siemEventsTable__thead ${className}`,
  role: 'rowgroup',
}))`
  background-color: ${({ theme }) => theme.eui.euiColorEmptyShade};
  border-bottom: ${({ theme }) => theme.eui.euiBorderWidthThick} solid
    ${({ theme }) => theme.eui.euiColorLightShade};
  position: sticky;
  top: 0;
  z-index: ${({ theme }) => theme.eui.euiZLevel1};
`;
EventsThead.displayName = 'EventsThead';

export const EventsTrHeader = styled.div.attrs(({ className }) => ({
  className: `siemEventsTable__trHeader ${className}`,
  role: 'row',
}))`
  display: flex;
`;
EventsTrHeader.displayName = 'EventsTrHeader';

export const EventsThGroupActions = styled.div.attrs(({ className = '' }) => ({
  className: `siemEventsTable__thGroupActions ${className}`,
}))<{ actionsColumnWidth: number; justifyContent: string }>`
  display: flex;
  flex: 0 0 ${({ actionsColumnWidth }) => actionsColumnWidth + 'px'};
  justify-content: ${({ justifyContent }) => justifyContent};
  min-width: 0;
`;
EventsThGroupActions.displayName = 'EventsThGroupActions';

export const EventsThGroupData = styled.div.attrs(({ className = '' }) => ({
  className: `siemEventsTable__thGroupData ${className}`,
}))<{ isDragging?: boolean }>`
  display: flex;

  > div:hover .siemEventsHeading__handle {
    display: ${({ isDragging }) => (isDragging ? 'none' : 'block')};
    opacity: 1;
    visibility: visible;
  }
`;
EventsThGroupData.displayName = 'EventsThGroupData';

export const EventsTh = styled.div.attrs(({ className = '' }) => ({
  className: `siemEventsTable__th ${className}`,
  role: 'columnheader',
}))`
  align-items: center;
  display: flex;
  flex-shrink: 0;
  min-width: 0;

  .siemEventsTable__thGroupActions &:first-child:last-child {
    flex: 1;
  }

  .siemEventsTable__thGroupData &:hover {
    background-color: ${({ theme }) => theme.eui.euiTableHoverColor};
    cursor: move; /* Fallback for IE11 */
    cursor: grab;
  }

  > div:focus {
    outline: 0; /* disable focus on Resizable element */
  }

  /* don't display Draggable placeholder */
  [data-rbd-placeholder-context-id] {
    display: none !important;
  }
`;
EventsTh.displayName = 'EventsTh';

export const EventsThContent = styled.div.attrs(({ className = '' }) => ({
  className: `siemEventsTable__thContent ${className}`,
}))<{ textAlign?: string }>`
  font-size: ${({ theme }) => theme.eui.euiFontSizeXS};
  font-weight: ${({ theme }) => theme.eui.euiFontWeightSemiBold};
  line-height: ${({ theme }) => theme.eui.euiLineHeight};
  min-width: 0;
  padding: ${({ theme }) => theme.eui.paddingSizes.xs};
  text-align: ${({ textAlign }) => textAlign};
  width: 100%; /* Using width: 100% instead of flex: 1 and max-width: 100% for IE11 */
`;
EventsThContent.displayName = 'EventsThContent';

/* EVENTS BODY */

export const EventsTbody = styled.div.attrs(({ className = '' }) => ({
  className: `siemEventsTable__tbody ${className}`,
  role: 'rowgroup',
}))`
  overflow-x: hidden;
`;
EventsTbody.displayName = 'EventsTbody';

export const EventsTrGroup = styled.div.attrs(({ className = '' }) => ({
  className: `siemEventsTable__trGroup ${className}`,
}))<{ className?: string }>`
  border-bottom: ${({ theme }) => theme.eui.euiBorderWidthThin} solid
    ${({ theme }) => theme.eui.euiColorLightShade};

  &:hover {
    background-color: ${({ theme }) => theme.eui.euiTableHoverColor};
  }
`;
EventsTrGroup.displayName = 'EventsTrGroup';

export const EventsTrData = styled.div.attrs(({ className = '' }) => ({
  className: `siemEventsTable__trData ${className}`,
  role: 'row',
}))`
  display: flex;
`;
EventsTrData.displayName = 'EventsTrData';

export const EventsTrSupplement = styled.div.attrs(({ className = '' }) => ({
  className: `siemEventsTable__trSupplement ${className}`,
}))<{ className: string }>`
  font-size: ${({ theme }) => theme.eui.euiFontSizeXS};
  line-height: ${({ theme }) => theme.eui.euiLineHeight};
  padding: 0 ${({ theme }) => theme.eui.paddingSizes.xs} 0
    ${({ theme }) => theme.eui.paddingSizes.xl};
`;
EventsTrSupplement.displayName = 'EventsTrSupplement';

export const EventsTdGroupActions = styled.div.attrs(({ className = '' }) => ({
  className: `siemEventsTable__tdGroupActions ${className}`,
}))<{ actionsColumnWidth: number }>`
  display: flex;
  justify-content: space-between;
  flex: 0 0 ${({ actionsColumnWidth }) => actionsColumnWidth + 'px'};
  min-width: 0;
`;
EventsTdGroupActions.displayName = 'EventsTdGroupActions';

export const EventsTdGroupData = styled.div.attrs(({ className = '' }) => ({
  className: `siemEventsTable__tdGroupData ${className}`,
}))`
  display: flex;
`;
EventsTdGroupData.displayName = 'EventsTdGroupData';

export const EventsTd = styled.div.attrs(({ className = '' }) => ({
  className: `siemEventsTable__td ${className}`,
  role: 'cell',
}))`
  align-items: center;
  display: flex;
  flex-shrink: 0;
  min-width: 0;

  .siemEventsTable__tdGroupActions &:first-child:last-child {
    flex: 1;
  }
`;
EventsTd.displayName = 'EventsTd';

export const EventsTdContent = styled.div.attrs(({ className }) => ({
  className: `siemEventsTable__tdContent ${className}`,
}))<{ textAlign?: string }>`
  font-size: ${({ theme }) => theme.eui.euiFontSizeXS};
  line-height: ${({ theme }) => theme.eui.euiLineHeight};
  min-width: 0;
  padding: ${({ theme }) => theme.eui.paddingSizes.xs};
  text-align: ${({ textAlign }) => textAlign};
  width: 100%; /* Using width: 100% instead of flex: 1 and max-width: 100% for IE11 */
`;
EventsTdContent.displayName = 'EventsTdContent';

/**
 * EVENTS HEADING
 */

export const EventsHeading = styled.div.attrs(({ className = '' }) => ({
  className: `siemEventsHeading ${className}`,
}))<{ isLoading: boolean }>`
  align-items: center;
  display: flex;

  &:hover {
    cursor: ${({ isLoading }) => (isLoading ? 'wait' : 'grab')};
  }
`;
EventsHeading.displayName = 'EventsHeading';

export const EventsHeadingTitleButton = styled.button.attrs(({ className = '' }) => ({
  className: `siemEventsHeading__title siemEventsHeading__title--aggregatable ${className}`,
  type: 'button',
}))`
  align-items: center;
  display: flex;
  font-weight: inherit;
  min-width: 0;

  &:hover,
  &:focus {
    color: ${({ theme }) => theme.eui.euiColorPrimary};
    text-decoration: underline;
  }

  &:hover {
    cursor: pointer;
  }

  & > * + * {
    margin-left: ${({ theme }) => theme.eui.euiSizeXS};
  }
`;
EventsHeadingTitleButton.displayName = 'EventsHeadingTitleButton';

export const EventsHeadingTitleSpan = styled.span.attrs(({ className }) => ({
  className: `siemEventsHeading__title siemEventsHeading__title--notAggregatable ${className}`,
}))`
  min-width: 0;
`;
EventsHeadingTitleSpan.displayName = 'EventsHeadingTitleSpan';

export const EventsHeadingExtra = styled.div.attrs(({ className = '' }) => ({
  className: `siemEventsHeading__extra ${className}`,
}))`
  margin-left: auto;

  &.siemEventsHeading__extra--close {
    opacity: 0;
    transition: all ${({ theme }) => theme.eui.euiAnimSpeedNormal} ease;
    visibility: hidden;

    .siemEventsTable__th:hover & {
      opacity: 1;
      visibility: visible;
    }
  }
`;
EventsHeadingExtra.displayName = 'EventsHeadingExtra';

export const EventsHeadingHandle = styled.div.attrs(({ className = '' }) => ({
  className: `siemEventsHeading__handle ${className}`,
}))`
  background-color: ${({ theme }) => theme.eui.euiBorderColor};
  height: 100%;
  opacity: 0;
  transition: all ${({ theme }) => theme.eui.euiAnimSpeedNormal} ease;
  visibility: hidden;
  width: ${({ theme }) => theme.eui.euiBorderWidthThick};

  &:hover {
    background-color: ${({ theme }) => theme.eui.euiColorPrimary};
    cursor: col-resize;
  }
`;
EventsHeadingHandle.displayName = 'EventsHeadingHandle';

/**
 * EVENTS LOADING
 */

export const EventsLoading = styled(EuiLoadingSpinner)`
  margin: ${({ theme }) => theme.eui.euiSizeXS};
  vertical-align: top;
`;
