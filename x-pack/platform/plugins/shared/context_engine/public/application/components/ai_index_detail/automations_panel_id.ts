/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const AUTOMATIONS_PANEL_ID = 'contextAiIndexAutomationsPanel';
export const AUTOMATIONS_HEADING_ID = 'contextAiIndexAutomationsHeading';

/** Scrolls to the Automations panel and focuses its heading, so a screen reader announces it. */
export const goToAutomations = (): void => {
  document
    .getElementById(AUTOMATIONS_PANEL_ID)
    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.getElementById(AUTOMATIONS_HEADING_ID)?.focus({ preventScroll: true });
};
