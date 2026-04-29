/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { InboxActionDetailRenderer, InboxActionDetailRendererLoader } from '../types';

type DetailRenderers = Map<string, InboxActionDetailRendererLoader>;

const DetailRenderersContext = createContext<DetailRenderers>(new Map());

export const InboxDetailRendererProvider = ({
  renderers,
  children,
}: {
  renderers: DetailRenderers;
  children: ReactNode;
}) => (
  <DetailRenderersContext.Provider value={renderers}>{children}</DetailRenderersContext.Provider>
);

/**
 * Resolves the detail renderer registered for `sourceApp` (if any) and
 * lazy-loads the component. Returns `null` while loading / when no renderer
 * is registered so the caller can render nothing or a fallback.
 */
export const useActionDetailRenderer = (sourceApp: string): InboxActionDetailRenderer | null => {
  const renderers = useContext(DetailRenderersContext);
  const [component, setComponent] = useState<InboxActionDetailRenderer | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loader = renderers.get(sourceApp);
    if (!loader) {
      setComponent(null);
      return;
    }
    loader()
      .then((loaded) => {
        if (!cancelled) setComponent(() => loaded);
      })
      .catch((error) => {
        // Swallow chunk-load or module-init failures so a broken
        // third-party renderer doesn't break the whole flyout — we simply
        // fall back to the default HITL form. The upstream error still
        // surfaces in the browser console via the default console handler.
        if (!cancelled) setComponent(null);
        // eslint-disable-next-line no-console
        console.error(`[inbox] failed to load detail renderer for sourceApp="${sourceApp}"`, error);
      });
    return () => {
      cancelled = true;
    };
  }, [renderers, sourceApp]);

  return component;
};
