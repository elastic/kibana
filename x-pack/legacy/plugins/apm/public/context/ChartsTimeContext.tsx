/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useState } from 'react';

const ChartsTimeContext = React.createContext<{
  time: number | null;
  setTime: (time: number | null) => unknown;
} | null>(null);

const ChartsTimeContextProvider: React.FC = ({ children }) => {
  const [time, setTime] = useState<number | null>(null);

  const value = useMemo(
    () => {
      return {
        time,
        setTime
      };
    },
    [time, setTime]
  );

  return <ChartsTimeContext.Provider value={value} children={children} />;
};

export { ChartsTimeContext, ChartsTimeContextProvider };
