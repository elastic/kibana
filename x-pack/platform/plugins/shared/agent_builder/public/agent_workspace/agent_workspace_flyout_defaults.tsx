/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useLayoutEffect, useMemo, useState } from 'react';
import type { RefObject } from 'react';
import { EuiComponentDefaultsProvider } from '@elastic/eui';

export const AGENT_WORKSPACE_MOUNT_TEST_SUBJ = 'agentWorkspaceMount';

/**
 * Agent Builder mounts into the chrome agent column via a separate React root.
 * Flyout defaults must be provided in that app tree — not only in the chrome tree.
 */
export const resolveAgentWorkspaceFlyoutContainer = (element: HTMLElement): HTMLElement => {
  const mountRoot = element.closest(`[data-test-subj="${AGENT_WORKSPACE_MOUNT_TEST_SUBJ}"]`);
  if (mountRoot instanceof HTMLElement) {
    return mountRoot;
  }
  return element.parentElement ?? element;
};

export const createAgentWorkspaceFlyoutDefaults = (container: HTMLElement | null) =>
  container
    ? {
        EuiFlyout: {
          container,
        },
      }
    : undefined;

interface AgentWorkspaceFlyoutDefaultsProps {
  containerRef: RefObject<HTMLElement | null>;
  children: React.ReactNode;
}

/**
 * Scope AB flyouts to the agent workspace column instead of the application workspace.
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
    () => createAgentWorkspaceFlyoutDefaults(container),
    [container]
  );

  return (
    <EuiComponentDefaultsProvider componentDefaults={componentDefaults}>
      {children}
    </EuiComponentDefaultsProvider>
  );
};
