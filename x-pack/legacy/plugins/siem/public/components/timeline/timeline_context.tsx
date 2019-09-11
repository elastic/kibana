/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext, useContext, useEffect, memo, useState } from 'react';

const initTimelineContext = false;
export const TimelineContext = createContext<boolean>(initTimelineContext);
export const useTimelineContext = () => useContext(TimelineContext);

const initTimelineWidth = 0;
export const TimelineWidthContext = createContext<number>(initTimelineWidth);
export const useTimelineWidthContext = () => useContext(TimelineWidthContext);

interface ManageTimelineContextProps {
  children: React.ReactNode;
  loading: boolean;
  width: number;
}

// todo we need to refactor this as more complex context/reducer with useReducer
// to avoid so many Context, at least the separation of code is there now
export const ManageTimelineContext = memo<ManageTimelineContextProps>(
  ({ children, loading, width }) => {
    const [myLoading, setLoading] = useState(initTimelineContext);
    const [myWidth, setWidth] = useState(initTimelineWidth);

    useEffect(() => {
      setLoading(loading);
    }, [loading]);

    useEffect(() => {
      setWidth(width);
    }, [width]);

    return (
      <TimelineContext.Provider value={myLoading}>
        <TimelineWidthContext.Provider value={myWidth}>{children}</TimelineWidthContext.Provider>
      </TimelineContext.Provider>
    );
  }
);
