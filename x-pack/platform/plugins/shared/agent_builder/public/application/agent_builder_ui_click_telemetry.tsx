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
import { resolveAgentBuilderUiClickPayload } from './agent_builder_ui_click_resolve';
import { useKibana } from './hooks/use_kibana';

const rootStyles = css`
  display: contents;
`;

/**
 * Capture-phase `click` on `document` so portaled EUI panels resolve.
 * Scoping is handled entirely by `resolveAgentBuilderUiClickPayload`: it only
 * returns a payload for clicks inside the mount subtree or on DOM carrying the
 * `agentBuilder.` EBT contract, so this component is safe to mount in both
 * the standalone app and embedded contexts.
 */
export const AgentBuilderUiClickTelemetry: React.FC<{ children: ReactNode }> = ({ children }) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const { services } = useKibana();

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const handler = (ev: MouseEvent) => {
      const payload = resolveAgentBuilderUiClickPayload(ev, root, window.location.pathname);
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
      document.removeEventListener('click', handler, true);
    };
  }, [services.analytics]);

  return (
    <div
      ref={rootRef}
      css={rootStyles}
      data-ebt-element={AGENT_BUILDER_UI_EBT.element.APP_ROOT}
      data-test-subj="agentBuilderUiClickTelemetryRoot"
    >
      {children}
    </div>
  );
};
