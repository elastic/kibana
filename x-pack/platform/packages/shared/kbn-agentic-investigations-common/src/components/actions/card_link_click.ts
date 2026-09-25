/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';

/**
 * Creates an onClick handler for controls embedded in a clickable card.
 * Stops the event from reaching the card, but lets modified/middle clicks fall through to the
 * browser so the link can be opened in a new tab.
 */
export const createCardLinkClickHandler =
  (onClick: () => void) =>
  (event: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>): void => {
    // The card behind this control is itself clickable, so the event must not reach it.
    event.stopPropagation();
    // Let modified clicks (new tab, new window) and middle clicks fall through to the
    // browser, which is the reason for rendering a real link in the first place.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    onClick();
  };
