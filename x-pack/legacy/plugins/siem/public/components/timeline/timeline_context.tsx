/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext, memo, useContext, useEffect, useState } from 'react';
import { TimelineAction } from './body/actions';

const initTimelineContext = false;
export const TimelineContext = createContext<boolean>(initTimelineContext);
export const useTimelineContext = () => useContext(TimelineContext);

const initTimelineWidth = 0;
export const TimelineWidthContext = createContext<number>(initTimelineWidth);
export const useTimelineWidthContext = () => useContext(TimelineWidthContext);

export interface TimelineTypeContextProps {
  documentType?: string;
  footerText?: string;
  loadingText?: string;
  queryFields?: string[];
  selectAll?: boolean;
  timelineActions?: TimelineAction[];
  title?: string;
}
const initTimelineType: TimelineTypeContextProps = {
  documentType: undefined,
  footerText: undefined,
  loadingText: undefined,
  queryFields: [],
  selectAll: false,
  timelineActions: [],
  title: undefined,
};
export const TimelineTypeContext = createContext<TimelineTypeContextProps>(initTimelineType);
export const useTimelineTypeContext = () => useContext(TimelineTypeContext);

interface ManageTimelineContextProps {
  children: React.ReactNode;
  loading: boolean;
  width: number;
  type?: TimelineTypeContextProps;
}

// todo we need to refactor this as more complex context/reducer with useReducer
// to avoid so many Context, at least the separation of code is there now
const ManageTimelineContextComponent: React.FC<ManageTimelineContextProps> = ({
  children,
  loading,
  width,
  type = initTimelineType,
}) => {
  const [myLoading, setLoading] = useState(initTimelineContext);
  const [myWidth, setWidth] = useState(initTimelineWidth);
  const [myType, setType] = useState(initTimelineType);

  useEffect(() => {
    setLoading(loading);
  }, [loading]);

  useEffect(() => {
    setType(type);
  }, [type]);

  useEffect(() => {
    setWidth(width);
  }, [width]);

  return (
    <TimelineContext.Provider value={myLoading}>
      <TimelineWidthContext.Provider value={myWidth}>
        <TimelineTypeContext.Provider value={myType}>{children}</TimelineTypeContext.Provider>
      </TimelineWidthContext.Provider>
    </TimelineContext.Provider>
  );
};

export const ManageTimelineContext = memo(ManageTimelineContextComponent);
