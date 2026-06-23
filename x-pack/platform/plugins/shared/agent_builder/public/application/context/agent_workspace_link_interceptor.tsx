/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScopedHistory } from '@kbn/core/public';
import { getClosestLink } from '@kbn/shared-ux-utility';
import React, { useEffect, useRef } from 'react';
import { AGENTBUILDER_PATH } from '../../../common/features';

const AGENT_BUILDER_PATH_SEGMENT = AGENTBUILDER_PATH;

/**
 * Intercepts Agent Builder app-link clicks inside the agent workspace mount so
 * GlobalRedirectAppLink does not move global history (which would break the
 * application workspace column, e.g. management ScopedHistory).
 */
export const AgentWorkspaceLinkInterceptor: React.FC<{
  history: ScopedHistory;
  children: React.ReactNode;
}> = ({ history, children }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const handler = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) {
        return;
      }

      if (event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (!target || !container.contains(target)) {
        return;
      }

      const link = getClosestLink(target) as HTMLAnchorElement | null;
      if (!link?.href || link.hasAttribute('data-kbn-redirect-app-link-ignore')) {
        return;
      }

      let url: URL;
      try {
        url = new URL(link.href, window.location.href);
      } catch {
        return;
      }

      if (url.origin !== window.location.origin) {
        return;
      }

      const segmentIndex = url.pathname.indexOf(AGENT_BUILDER_PATH_SEGMENT);
      if (segmentIndex === -1) {
        return;
      }

      const inAppPath = url.pathname.slice(segmentIndex + AGENT_BUILDER_PATH_SEGMENT.length) || '/';

      event.preventDefault();
      event.stopPropagation();

      history.push(`${inAppPath}${url.search}`);
    };

    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, [history]);

  return (
    <div ref={containerRef} style={{ display: 'contents' }}>
      {children}
    </div>
  );
};
