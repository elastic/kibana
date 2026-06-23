/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppLeaveHandler } from '@kbn/core-application-browser';
import { CoreScopedHistory } from '@kbn/core-application-browser-internal';
import type { CoreStart } from '@kbn/core/public';
import { css } from '@emotion/react';
import { createMemoryHistory } from 'history';
import React, { useEffect, useRef } from 'react';
import { AGENTBUILDER_PATH } from '../../common/features';
import type { AgentBuilderInternalService } from '../services';
import type { AgentBuilderStartDependencies } from '../types';

const mountRootStyles = css`
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  min-height: 0;
  min-width: 0;
  height: 100%;
  width: 100%;

  /* POC: AB views size via application content height until agent-slot vars land in CP6 */
  --kbn-application--content-height: 100%;
`;

export interface AgentWorkspaceMountContext {
  core: CoreStart;
  plugins: AgentBuilderStartDependencies;
  getServices: () => AgentBuilderInternalService;
}

let mountContext: AgentWorkspaceMountContext | null = null;

export const setAgentWorkspaceMountContext = (context: AgentWorkspaceMountContext | null): void => {
  mountContext = context;
};

const createAgentScopedHistory = () => {
  const memoryHistory = createMemoryHistory({ initialEntries: [AGENTBUILDER_PATH] });
  const scopedHistory = new CoreScopedHistory(memoryHistory, AGENTBUILDER_PATH);
  scopedHistory.replace('/agents');
  return scopedHistory;
};

/**
 * Mounts the full Agent Builder application into the chrome agent workspace slot.
 */
export function AgentWorkspaceMount() {
  const elementRef = useRef<HTMLDivElement>(null);
  const unmountRef = useRef<(() => void) | null>(null);
  const appLeaveHandlerRef = useRef<AppLeaveHandler | null>(null);

  useEffect(() => {
    const context = mountContext;
    const element = elementRef.current;

    if (!context || !element) {
      return;
    }

    let cancelled = false;

    const mount = async () => {
      const { mountApp } = await import('../application');
      const { core, plugins, getServices } = context;
      const history = createAgentScopedHistory();

      const unmount = await mountApp({
        core,
        plugins,
        services: getServices(),
        element,
        history,
        isAgentWorkspaceMount: true,
        onAppLeave: (handler) => {
          appLeaveHandlerRef.current = handler;
        },
      });

      if (cancelled) {
        unmount();
        return;
      }

      unmountRef.current = unmount;
    };

    mount().catch((error) => {
      // eslint-disable-next-line no-console
      console.error('Failed to mount Agent Builder in agent workspace slot', error);
    });

    return () => {
      cancelled = true;
      appLeaveHandlerRef.current = null;
      if (unmountRef.current) {
        unmountRef.current();
        unmountRef.current = null;
      }
    };
  }, []);

  return (
    <div css={mountRootStyles} data-test-subj="agentWorkspaceMount">
      <div
        ref={elementRef}
        css={css`
          display: flex;
          flex-direction: column;
          flex-grow: 1;
          min-height: 0;
          min-width: 0;
          height: 100%;
          width: 100%;
        `}
      />
    </div>
  );
}
