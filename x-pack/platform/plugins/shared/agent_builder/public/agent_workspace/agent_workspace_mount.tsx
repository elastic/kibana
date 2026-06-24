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
import { layoutVar } from '@kbn/ui-chrome-layout-constants';
import { createMemoryHistory } from 'history';
import React, { useEffect, useRef } from 'react';
import { AGENTBUILDER_PATH } from '../../common/features';
import type { AgentBuilderInternalService } from '../services';
import type { AgentBuilderStartDependencies } from '../types';
import { AgentWorkspaceFlyoutDefaults } from './agent_workspace_flyout_defaults';
import {
  clearAgentWorkspaceMountLeaveHandler,
  setAgentWorkspaceMountLeaveHandler,
} from './agent_workspace_app_leave';
import {
  clearAgentWorkspaceNavigation,
  setAgentWorkspaceScopedHistory,
} from './agent_workspace_navigation';

const AGENT_WORKSPACE_ACTIVE_ATTR = 'data-agent-workspace-active';

const mountRootStyles = css`
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  min-height: 0;
  min-width: 0;
  height: 100%;
  width: 100%;
  position: relative;

  /* Legacy AB layout vars — map agent workspace chrome dimensions */
  --kbn-application--content-height: ${layoutVar('agent.height')};
  --kbn-application--content-width: ${layoutVar('agent.width')};
  --kbn-application--sticky-headers-offset: 0px;
  --kbnAppHeadersOffset: 0px;
  --kbnProjectHeaderAppActionMenuHeight: 0px;
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
  const flyoutContainerRef = useRef<HTMLDivElement>(null);
  const elementRef = useRef<HTMLDivElement>(null);
  const unmountRef = useRef<(() => void) | null>(null);
  const appLeaveHandlerRef = useRef<AppLeaveHandler | null>(null);
  const mountGenerationRef = useRef(0);

  useEffect(() => {
    document.body.setAttribute(AGENT_WORKSPACE_ACTIVE_ATTR, 'true');
    return () => {
      document.body.removeAttribute(AGENT_WORKSPACE_ACTIVE_ATTR);
    };
  }, []);

  useEffect(() => {
    const context = mountContext;
    const element = elementRef.current;

    if (!context || !element) {
      return;
    }

    const generation = ++mountGenerationRef.current;

    const mount = async () => {
      const { mountApp } = await import('../application');
      const { core, plugins, getServices } = context;
      const history = createAgentScopedHistory();
      setAgentWorkspaceScopedHistory(history);

      const unmount = await mountApp({
        core,
        plugins,
        services: getServices(),
        element,
        history,
        isAgentWorkspaceMount: true,
        onAppLeave: (handler) => {
          appLeaveHandlerRef.current = handler;
          setAgentWorkspaceMountLeaveHandler(handler);
        },
      });

      if (generation !== mountGenerationRef.current) {
        return;
      }

      unmountRef.current = unmount;
    };

    mount().catch((error) => {
      // eslint-disable-next-line no-console
      console.error('Failed to mount Agent Builder in agent workspace slot', error);
    });

    return () => {
      mountGenerationRef.current += 1;
      appLeaveHandlerRef.current = null;
      clearAgentWorkspaceMountLeaveHandler();
      setAgentWorkspaceScopedHistory(null);
      clearAgentWorkspaceNavigation();
      if (unmountRef.current) {
        unmountRef.current();
        unmountRef.current = null;
      }
    };
  }, []);

  return (
    <div css={mountRootStyles} data-test-subj="agentWorkspaceMount" ref={flyoutContainerRef}>
      <AgentWorkspaceFlyoutDefaults containerRef={flyoutContainerRef}>
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
      </AgentWorkspaceFlyoutDefaults>
    </div>
  );
}
