/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useState } from 'react';
import { toQuery, fromQuery } from '../components/shared/Links/url_helpers';
import { history } from '../utils/history';

const ChartsSyncContext = React.createContext<{
  hoverX: number | null;
  onHover: (hoverX: number) => void;
  onMouseLeave: () => void;
  onSelectionEnd: (range: { start: number; end: number }) => void;
} | null>(null);

const ChartsSyncContextProvider: React.FC = ({ children }) => {
  const [time, setTime] = useState<number | null>(null);

  const value = useMemo(() => {
    const hoverXHandlers = {
      onHover: (hoverX: number) => {
        setTime(hoverX);
      },
      onMouseLeave: () => {
        setTime(null);
      },
      onSelectionEnd: (range: { start: number; end: number }) => {
        setTime(null);

        const currentSearch = toQuery(history.location.search);
        const nextSearch = {
          rangeFrom: new Date(range.start).toISOString(),
          rangeTo: new Date(range.end).toISOString()
        };

        history.push({
          ...history.location,
          search: fromQuery({
            ...currentSearch,
            ...nextSearch
          })
        });
      },
      hoverX: time
    };

    return { ...hoverXHandlers };
  }, [time, setTime]);

  return <ChartsSyncContext.Provider value={value} children={children} />;
};

export { ChartsSyncContext, ChartsSyncContextProvider };
