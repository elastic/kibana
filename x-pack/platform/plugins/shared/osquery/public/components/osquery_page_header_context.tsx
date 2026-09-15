/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useLayoutEffect, useMemo, useState } from 'react';

interface OsqueryPageHeaderContextValue {
  title: string | undefined;
  setTitle: (title: string | undefined) => void;
}

const OsqueryPageHeaderContext = createContext<OsqueryPageHeaderContextValue>({
  title: undefined,
  setTitle: () => {},
});

export const OsqueryPageHeaderProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [title, setTitle] = useState<string | undefined>(undefined);
  const value = useMemo(() => ({ title, setTitle }), [title]);

  return (
    <OsqueryPageHeaderContext.Provider value={value}>{children}</OsqueryPageHeaderContext.Provider>
  );
};

export const useOsqueryPageHeaderTitle = (): string | undefined =>
  useContext(OsqueryPageHeaderContext).title;

/**
 * Publishes a dynamic AppHeader title for the current Osquery sub-page.
 * MainNavigation owns the header chrome; this only supplies the title string.
 */
export const useOsquerySubpageTitle = (title: string | undefined) => {
  const { setTitle } = useContext(OsqueryPageHeaderContext);

  useLayoutEffect(() => {
    // Skip undefined so a pack/query id switch does not wipe the current title
    // and flash the header skeleton. The tradeoff is a brief stale title.
    if (title === undefined) {
      return;
    }

    setTitle(title);

    return () => {
      setTitle(undefined);
    };
  }, [setTitle, title]);
};
