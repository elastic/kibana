/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext } from 'react';

/**
 * Allows descendants to portal content into a header area (flyout header
 * or page header).
 *
 * The parent creates a target `<div>` inside its header and exposes the
 * DOM element via this context. Form components deeper in the tree can use
 * `useHeaderActionPortal()` to obtain the element and render into it with
 * `createPortal`.
 *
 * Uses a state-based callback ref (not useRef) so that a re-render is
 * triggered when the element mounts, ensuring the portal is available on
 * the first meaningful paint.
 */
const HeaderActionPortalContext = createContext<HTMLDivElement | null>(null);

export const HeaderActionPortalProvider = HeaderActionPortalContext.Provider;

/**
 * Returns the header portal target element, or `null` when no portal
 * target has been provided by a parent.
 */
export const useHeaderActionPortal = (): HTMLDivElement | null =>
  useContext(HeaderActionPortalContext);
