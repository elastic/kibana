/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useLayoutEffect, useMemo, useState } from 'react';
import type { RefObject } from 'react';
import { EuiComponentDefaultsProvider } from '@elastic/eui';

interface AgentWorkspaceFlyoutDefaultsProps {
  containerRef: RefObject<HTMLElement | null>;
  children: React.ReactNode;
}

/**
 * Scope AB flyouts to the agent workspace column instead of the application workspace.
 * Always renders the provider so the child DOM tree stays stable for ReactDOM.mount targets.
 */
export const AgentWorkspaceFlyoutDefaults: React.FC<AgentWorkspaceFlyoutDefaultsProps> = ({
  containerRef,
  children,
}) => {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    setContainer(containerRef.current);
  }, [containerRef]);

  const componentDefaults = useMemo(
    () =>
      container
        ? {
            EuiFlyout: {
              container,
            },
          }
        : undefined,
    [container]
  );

  return (
    <EuiComponentDefaultsProvider componentDefaults={componentDefaults}>
      {children}
    </EuiComponentDefaultsProvider>
  );
};
