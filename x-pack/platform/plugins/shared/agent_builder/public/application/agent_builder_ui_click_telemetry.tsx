/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import {
  AGENT_BUILDER_EVENT_TYPES,
  AGENT_BUILDER_UI_EBT,
  type ReportUiClickParams,
} from '@kbn/agent-builder-common/telemetry';
import React, { type ReactNode, useEffect, useRef } from 'react';
import { isAgentBuilderUiClickRoutePathname } from './agent_builder_ui_click_route_guard';
import { resolveAgentBuilderUiClickPayload } from './agent_builder_ui_click_resolve';
import { useKibana } from './hooks/use_kibana';

const rootStyles = css`
  display: inherit;
  height: inherit;
  width: inherit;
  flex: 1 1 0%;
`;

/**
 * Capture-phase `click` on `document` so portaled EUI panels resolve; only runs when the
 * scoped router is on an Agent Builder path. `resolveAgentBuilderUiClickPayload` further
 * restricts to the mount subtree or DOM carrying the `agentBuilder.` EBT contract.
 */
export const AgentBuilderUiClickTelemetry: React.FC<{ children: ReactNode }> = ({ children }) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const { services } = useKibana();
  const pathnameRef = useRef(services.appParams.history.location.pathname);

  useEffect(() => {
    const root = rootRef.current;
    const history = services.appParams.history;

    pathnameRef.current = history.location.pathname;
    const unlistenHistory = history.listen(({ pathname }) => {
      pathnameRef.current = pathname;
    });

    if (!root) {
      return unlistenHistory;
    }

    const handler = (ev: MouseEvent) => {
      if (!isAgentBuilderUiClickRoutePathname(pathnameRef.current)) {
        return;
      }
      const payload = resolveAgentBuilderUiClickPayload(ev, root, pathnameRef.current);
      if (!payload) {
        return;
      }
      services.analytics.reportEvent<ReportUiClickParams>(
        AGENT_BUILDER_EVENT_TYPES.UiClick,
        payload
      );
    };

    document.addEventListener('click', handler, true);
    return () => {
      unlistenHistory();
      document.removeEventListener('click', handler, true);
    };
  }, [services.analytics, services.appParams.history]);

  return (
    <div
      ref={rootRef}
      css={rootStyles}
      data-ebt-element={AGENT_BUILDER_UI_EBT.element.appRoot}
      data-test-subj="agentBuilderUiClickTelemetryRoot"
    >
      {children}
    </div>
  );
};
