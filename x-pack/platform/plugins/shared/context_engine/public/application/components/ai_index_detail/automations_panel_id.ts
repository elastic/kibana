/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** DOM id of the Automations panel, so links can scroll to it. */
export const AUTOMATIONS_PANEL_ID = 'contextAiIndexAutomationsPanel';
/** DOM id of the Automations heading, so links can move focus to it. */
export const AUTOMATIONS_HEADING_ID = 'contextAiIndexAutomationsHeading';

/**
 * Scrolls to the Automations panel and moves keyboard focus to its heading, so a screen reader
 * announces "Automations" and Tab continues from there.
 */
export const goToAutomations = (): void => {
  document
    .getElementById(AUTOMATIONS_PANEL_ID)
    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.getElementById(AUTOMATIONS_HEADING_ID)?.focus({ preventScroll: true });
};
